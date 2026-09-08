#!/usr/bin/env python3
# Copyright (c) 2026 mtgh. Licensed under mtgh Noncommercial Software License 1.0; see LICENSE-TOOLS.
"""Read-only spatial registry audit and change-impact lookup; Python stdlib only."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path



def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def resolve(root, value):
    return root / value


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def point(node):
    angle = math.radians(node['a'])
    return (node['r'] * math.cos(angle), node['r'] * math.sin(angle), node['z'])


def chord_m(a, b):
    return 1000 * math.sqrt(sum((x-y)**2 for x, y in zip(point(a), point(b))))


def audit(pointer, episode=None):
    root, registry = pointer.parent, read(pointer)
    findings, checked, speeds = [], [], []

    def issue(level, code, detail):
        findings.append(dict(level=level, code=code, detail=detail))

    def load_ref(ref, label, parse=True, missing_level='ERROR', stale_level='STALE'):
        path = resolve(root, ref['path'])
        if not path.is_file():
            issue(missing_level, 'MISSING_FILE', f'{label}: {path}')
            return None
        actual = digest(path)
        checked.append(str(path))
        if actual != ref['sha256']:
            issue(stale_level, 'HASH_CHANGED', f'{label}: {path}')
        return read(path) if parse else actual

    if registry.get('schema_version') != 1:
        raise ValueError('Unsupported registry schema_version')
    g = load_ref(registry['global'], 'global')
    c = load_ref(registry['contracts'], 'contracts')
    p = load_ref(registry['provenance'], 'provenance')
    load_ref(registry['rules'], 'rules', False)
    for key in ['global_document', 'global_view']:
        if key in registry:
            load_ref(registry[key], key, False)
    if not all(x is not None for x in (g, c, p)):
        return {'status': 'ERROR', 'findings': findings}
    if c['global_version'] != g['version']:
        issue('STALE', 'CONTRACT_VERSION', c['global_version'])
    nodes = {}
    geo = g['geometry']
    geometry_valid = all(finite(geo.get(k)) and geo[k] > 0 for k in
                         ['innerWallRadiusKm', 'outerShellRadiusKm', 'lengthKm', 'clearCoreRadiusKm'])
    if not geometry_valid or not (geo['clearCoreRadiusKm'] < geo['innerWallRadiusKm'] < geo['outerShellRadiusKm']):
        issue('ERROR', 'GEOMETRY', 'Expected positive clear < inner < outer radii and axial length')
        geometry_valid = False
    valid_coords = set()
    for n in g['scenes']:
        if n['id'] in nodes:
            issue('ERROR', 'DUPLICATE_NODE', n['id'])
        nodes[n['id']] = n
        if n.get('physical'):
            if not all(finite(n.get(k)) for k in ['a', 'r', 'z']):
                issue('ERROR', 'COORDINATE', n['id'])
            elif geometry_valid and (n['r'] < 0 or n['r'] > geo['outerShellRadiusKm'] or abs(n['z']) > geo['lengthKm']/2):
                issue('ERROR', 'CITY_BOUNDS', n['id'])
            else:
                valid_coords.add(n['id'])
    eps = {e['ep']: e for e in g['episodes']}
    if len(eps) != len(g['episodes']):
        issue('ERROR', 'DUPLICATE_EPISODE', 'episodes')
    if episode is not None and episode not in eps:
        issue('ERROR', 'EPISODE_NOT_PLANNED', str(episode))
    for ep in g['episodes']:
        for route in ep['routes']:
            for node in route['nodes']:
                if node not in nodes:
                    issue('ERROR', 'UNKNOWN_ROUTE_NODE', f"EP{ep['ep']} {node}")
    local_data = {}
    for entry in registry['locals']:
        if episode is not None and entry['episode'] != episode:
            continue
        local = load_ref(entry['data'], f"local EP{entry['episode']}")
        for key in ['document', 'view']:
            if key in entry:
                load_ref(entry[key], f"local {key} EP{entry['episode']}", False)
        if local is None:
            continue
        local_data[entry['episode']] = (entry, local)
        if local['globalVersion'] != g['version']:
            issue('STALE', 'LOCAL_VERSION', local['version'])
        seen = set()
        for n in local['nodes']:
            if n['id'] in seen:
                issue('ERROR', 'DUPLICATE_LOCAL_NODE', n['id'])
            seen.add(n['id'])
            if n['id'] not in nodes:
                issue('ERROR', 'UNKNOWN_LOCAL_NODE', n['id'])
            elif any(n.get(k) != nodes[n['id']].get(k) for k in ['a', 'r', 'z', 'physical']):
                issue('ERROR', 'LOCAL_GLOBAL_DRIFT', n['id'])
        for lane in local.get('timing', []):
            last = -math.inf
            for start, end, label in lane['spans']:
                if not finite(start) or not finite(end) or start < 0 or end <= start or start < last:
                    issue('ERROR', 'LOCAL_TIME_INTERVAL', f"{lane['who']}: {label}")
                last = end
    if episode is not None and episode not in local_data:
        issue('REVIEW', 'NO_LOCAL_PLAN', f'EP{episode}; decide whether event scope needs local detail')

    edges = {}
    for e in c['edges']:
        eid = e['id']
        if eid in edges:
            issue('ERROR', 'DUPLICATE_EDGE', eid)
        edges[eid] = e
        if e['from'] not in nodes or e['to'] not in nodes:
            issue('ERROR', 'UNKNOWN_EDGE_NODE', eid)
            continue
        if not finite(e.get('length_m')) or e['length_m'] <= 0:
            issue('ERROR', 'EDGE_LENGTH', eid)
            continue
        if e['from'] not in valid_coords or e['to'] not in valid_coords:
            issue('ERROR', 'NON_GEOGRAPHIC_EDGE', eid)
        elif e['length_m'] + 1 < chord_m(nodes[e['from']], nodes[e['to']]):
            issue('ERROR', 'LENGTH_BELOW_CHORD', eid)
        if 'speed_ceiling_mps' in e and (not finite(e['speed_ceiling_mps']) or e['speed_ceiling_mps'] <= 0):
            issue('ERROR', 'SPEED_LIMIT', eid)
    occupancy = {}
    selected_journeys = []
    journey_ids = set()
    for j in c['journeys']:
        if j['id'] in journey_ids:
            issue('ERROR', 'DUPLICATE_JOURNEY', j['id'])
        journey_ids.add(j['id'])
        if episode is not None and j['episode'] != episode:
            continue
        selected_journeys.append(j)
        local_pair = local_data.get(j['episode'])
        if 'source_local_version' in j:
            if local_pair is None or local_pair[1]['version'] != j['source_local_version']:
                issue('STALE', 'JOURNEY_LOCAL_VERSION', j['id'])
            else:
                local_legs = {(leg[0], leg[1]): leg[2] for leg in local_pair[1].get('legs', [])}
                for step in j['steps']:
                    edge = edges.get(step['edge_id'])
                    if edge and local_legs.get((edge['from'], edge['to'])) != edge['length_m']:
                        issue('ERROR', 'LOCAL_CONTRACT_DRIFT', step['edge_id'])
        if 'route_name' in j:
            route = next((r for r in eps.get(j['episode'], {}).get('routes', []) if r['name'] == j['route_name']), None)
            js = [edges[s['edge_id']] for s in j['steps'] if s['edge_id'] in edges]
            path = ([js[0]['from']] + [e['to'] for e in js]) if js else []
            if route is None or route['nodes'] != path:
                issue('ERROR', 'GLOBAL_JOURNEY_DRIFT', j['id'])
        previous, last_end = None, -math.inf
        for s in j['steps']:
            e = edges.get(s['edge_id'])
            if e is None:
                issue('ERROR', 'UNKNOWN_STEP_EDGE', f"{j['id']} {s['edge_id']}")
                continue
            if previous is not None and previous != e['from']:
                issue('ERROR', 'DISCONNECTED_JOURNEY', j['id'])
            previous = e['to']
            start, end = s['start_min'], s['end_min']
            hold = s.get('stationary_seconds', 0)
            if not all(finite(x) for x in [start, end, hold]) or start < 0 or end <= start or start < last_end or hold < 0:
                issue('ERROR', 'JOURNEY_TIME_INTERVAL', j['id'])
                continue
            last_end = end
            seconds = (end-start)*60-hold
            if seconds <= 0:
                issue('ERROR', 'NO_MOVEMENT_TIME', j['id'])
                continue
            if finite(e.get('length_m')) and e['length_m'] > 0:
                required = e['length_m']/seconds
                speeds.append(dict(journey=j['id'], edge=e['id'], minimum_average_mps=round(required, 3)))
                ceiling = e.get('speed_ceiling_mps')
                if finite(ceiling) and ceiling > 0 and required > ceiling:
                    issue('ERROR', 'TRAVEL_TOO_FAST', f"{j['id']} {e['id']}: {required:.3f} > {ceiling}")
            for actor in j['actors']:
                key = (j['clock'], actor)
                occupancy.setdefault(key, []).append((start, end, j['id']))
    for (clock, actor), spans in occupancy.items():
        spans.sort()
        for a, b in zip(spans, spans[1:]):
            if b[0] < a[1]:
                issue('ERROR', 'ACTOR_OVERLAP', f'{clock} {actor}: {a[2]} / {b[2]}')
    selected_eps = None if episode is None else {episode-1, episode, episode+1}
    for src in p['sources']:
        if selected_eps is not None and src['episodes'] and not selected_eps.intersection(src['episodes']):
            continue
        historical = src['role'] == 'historical_input'
        load_ref(src, src['role'], False, 'REVIEW' if historical else 'ERROR', 'REVIEW' if historical else 'STALE')
    load_ref(g['reference'], 'cosmic reference', False)
    for binding in p['bindings']:
        if episode is not None and binding['episode'] != episode:
            continue
        load_ref(binding['novel'], f"novel EP{binding['episode']}", False)
        if binding['global_version'] != g['version'] or binding['global_sha256'] != registry['global']['sha256']:
            issue('STALE', 'NOVEL_GLOBAL_BINDING', str(binding['episode']))
        pair = local_data.get(binding['episode'])
        if pair is None or binding['local_version'] != pair[1]['version'] or binding['local_sha256'] != pair[0]['data']['sha256']:
            issue('STALE', 'NOVEL_LOCAL_BINDING', str(binding['episode']))
        for node in binding['scene_ids']:
            if node not in nodes:
                issue('ERROR', 'UNKNOWN_BOUND_NODE', node)
    coverage = [x for x in c['coverage'] if episode is None or x['episode'] in [None, episode]]
    for item in coverage:
        if item['status'] != 'complete':
            issue('REVIEW', 'COVERAGE', item['limitation'])
    if selected_journeys and any('speed_ceiling_mps' not in edges[s['edge_id']] for j in selected_journeys for s in j['steps'] if s['edge_id'] in edges):
        issue('REVIEW', 'SPEED_UNSPECIFIED', 'Required averages are reported; travel plausibility and stationary time still require scene review')
    level = 'ERROR' if any(x['level'] == 'ERROR' for x in findings) else 'STALE' if any(x['level'] == 'STALE' for x in findings) else 'REVIEW' if findings else 'OK'
    return dict(status=level, registry=registry['version'], episode=episode,
                counts=dict(nodes=len(nodes), episodes=len(eps), checked_files=len(set(checked)),
                            checked_journeys=len(selected_journeys), declared_edges=len(edges)),
                findings=findings, minimum_average_speeds=speeds,
                limitation='Data consistency only; not a proof of prose, visibility, gravity engineering, or all historical routes')


def impact(pointer, node_ids, candidate=None):
    root, registry = pointer.parent, read(pointer)
    g = read(resolve(root, registry['global']['path']))
    p = read(resolve(root, registry['provenance']['path']))
    current = {n['id']: n for n in g['scenes']}
    changed = set(node_ids)
    unknown = changed - current.keys()
    if unknown:
        raise ValueError('Unknown node IDs: ' + ', '.join(sorted(unknown)))
    geometry_change, route_changes, updated = False, set(), None
    if candidate:
        updated = read(candidate)
        newer = {n['id']: n for n in updated['scenes']}
        # Ignore only historical coordinate snapshots, which cannot affect current geography.
        def material(n):
            return {k: v for k, v in n.items() if k not in ['r01Coordinate', 'r02Coordinate']}
        changed.update(k for k in current.keys() | newer.keys() if material(current.get(k, {})) != material(newer.get(k, {})))
        geometry_change = g['geometry'] != updated['geometry'] or g['reference'] != updated['reference']
        old_routes = {e['ep']: e['routes'] for e in g['episodes']}
        new_routes = {e['ep']: e['routes'] for e in updated['episodes']}
        route_changes = {e for e in old_routes.keys() | new_routes.keys() if old_routes.get(e) != new_routes.get(e)}
    affected = set(route_changes)
    for source in [g] + ([updated] if updated else []):
        for e in source['episodes']:
            mentioned = {n for route in e['routes'] for n in route['nodes']}
            if geometry_change or mentioned & changed:
                affected.add(e['ep'])
        for n in source['scenes']:
            if n['id'] in changed:
                affected.update(n.get('eps', []))
    bindings = [b for b in p['bindings'] if b['episode'] in affected or changed.intersection(b['scene_ids'])]
    return dict(status='REVIEW_REQUIRED' if affected else 'NO_LISTED_DEPENDENCIES',
                changed_nodes=sorted(changed), global_geometry_changed=geometry_change,
                affected_episodes=sorted(affected), affected_novels=[b['novel'] for b in bindings],
                limitation='Listed dependencies only; local-edge changes should pass their endpoint IDs. No files were changed.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--registry', type=Path, required=True, help='Explicit path to current.json; no default private registry')
    commands = parser.add_subparsers(dest='command', required=True)
    audit_parser = commands.add_parser('audit')
    audit_parser.add_argument('--episode', type=int)
    impact_parser = commands.add_parser('impact')
    impact_parser.add_argument('--nodes', nargs='*', default=[])
    impact_parser.add_argument('--candidate', type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'audit':
            result = audit(args.registry, args.episode)
        else:
            if not args.nodes and not args.candidate:
                parser.error('impact requires --nodes or --candidate')
            result = impact(args.registry, args.nodes, args.candidate)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        result = dict(status='ERROR', findings=[dict(level='ERROR', code='REGISTRY_READ_OR_SCHEMA', detail=str(exc))])
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))
    return 1 if result['status'] in ['ERROR', 'STALE'] else 0


if __name__ == '__main__':
    sys.exit(main())
