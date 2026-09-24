#!/usr/bin/env python3
"""Build data/skills_tree.json — detailed side-scroll tech tree for Quintile Pages."""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]  # site/
DATA = ROOT / "data"
OUT = DATA / "skills_tree.json"

PREFIX_COURSE = {
    "ari": "arithmetic",
    "lin": "linear",
    "top": "topology",
    "inf": "infinite",
    "mea": "measures",
    "geo": "geometry",
    "pc": "precalculus",
    "cal": "calculus",
    "stat": "statistics",
    "mec": "mechanics",
    "alg": "algebra",
    "tri": "trigonometry",
    "fun": "functions",
    "pre": "prealgebra",
    "app": "applications",
    "aas": "aa-sl",
    "aah": "aa-hl",
}

COURSE_MOTIF = {
    "measures": "clock",
    "arithmetic": "numbers",
    "prealgebra": "algebra",
    "geometry": "shapes",
    "algebra": "algebra",
    "trigonometry": "trig",
    "higher": "book",
    "precalculus": "graph",
    "functions": "function",
    "aa-sl": "calculator",
    "aa-hl": "star",
    "applications": "globe",
    "calculus": "graph",
    "statistics": "dice",
    "linear": "matrix",
    "mechanics": "atom",
    "infinite": "infinity",
    "topology": "hub",
}

SKILL_MOTIF = {
    "indices": "numbers",
    "manipulation": "algebra",
    "linear": "ruler",
    "quadratics": "quadratic",
    "logs": "log",
    "functions": "function",
    "trig": "trig",
    "chance": "dice",
}

KIND_MOTIF = {
    "era": "hub",
    "course": "hub",
    "foundation": "book",
    "foundation-leaf": "numbers",
    "track-leaf": "shapes",
    "syllabus-leaf": "star",
    "skill-topic": "calculator",
    "skill-item": "check",
}


def load(name: str):
    return json.loads((DATA / name).read_text())


def course_from_leaf_id(lid: str) -> str | None:
    # longest prefix match
    best = None
    for pref, course in PREFIX_COURSE.items():
        if lid == pref or lid.startswith(pref + "-"):
            if best is None or len(pref) > len(best[0]):
                best = (pref, course)
    return best[1] if best else None


def add_edge(nodes: dict, edges: list, frm: str, to: str, kind: str = "unlocks"):
    if frm not in nodes or to not in nodes or frm == to:
        return
    key = (frm, to, kind)
    if key in add_edge._seen:
        return
    add_edge._seen.add(key)
    edges.append({"from": frm, "to": to, "kind": kind})
    nodes[frm].setdefault("unlocks", [])
    nodes[to].setdefault("requires", [])
    if to not in nodes[frm]["unlocks"]:
        nodes[frm]["unlocks"].append(to)
    if frm not in nodes[to]["requires"]:
        nodes[to]["requires"].append(frm)


add_edge._seen = set()


def seq_edges(nodes, edges, ids):
    for a, b in zip(ids, ids[1:]):
        add_edge(nodes, edges, a, b, "sequence")


def main():
    atlas = load("atlas.json")
    skills = load("skills.json")
    foundations = load("foundations_topics.json")
    tracks = load("tracks_topics.json")
    syllabus = load("syllabus.json")
    additions = load("track_outlines_additions.json")

    nodes: dict[str, dict] = {}
    edges: list = []
    eras = atlas["eras"]
    courses = atlas["courses"]
    course_by_id = {c["id"]: c for c in courses}

    # Era hubs
    for e in eras:
        nid = f"era:{e['id']}"
        nodes[nid] = {
            "id": nid,
            "title": e["title"],
            "blurb": f"Era {e['numeral']}",
            "era": e["id"],
            "courseId": None,
            "kind": "era",
            "requires": [],
            "unlocks": [],
            "href": "/",
            "motif": "hub",
            "numeral": e["numeral"],
        }
    for a, b in zip(eras, eras[1:]):
        add_edge(nodes, edges, f"era:{a['id']}", f"era:{b['id']}", "era")

    # Course hubs
    for c in courses:
        nid = f"course:{c['id']}"
        dest = c.get("dest") or {}
        if dest.get("kind") == "track":
            href = f"/track/{dest.get('id', c['id'])}"
        elif dest.get("kind") == "foundations":
            href = "/foundations"
        elif dest.get("kind") == "syllabus":
            href = "/syllabus"
        else:
            href = f"/track/{c['id']}"
        nodes[nid] = {
            "id": nid,
            "title": c["title"],
            "blurb": c.get("blurb") or "",
            "era": c["era"],
            "courseId": c["id"],
            "kind": "course",
            "requires": [],
            "unlocks": [],
            "href": href,
            "motif": COURSE_MOTIF.get(c["id"], "hub"),
            "row": c.get("row", 0),
        }
        add_edge(nodes, edges, f"era:{c['era']}", nid, "contains")
        for req in c.get("requires") or []:
            add_edge(nodes, edges, f"course:{req}", nid, "requires")

    # Foundations (higher / skills pathway)
    foundation_leaves = []
    majors = [t for t in foundations if "." not in str(t["code"])]
    for m in majors:
        nid = f"foundation:{m['id']}"
        nodes[nid] = {
            "id": nid,
            "title": m["title"],
            "blurb": f"Foundation unit {m['code']}",
            "era": "secondary",
            "courseId": "higher",
            "kind": "foundation",
            "requires": [],
            "unlocks": [],
            "href": "/foundations",
            "motif": "book",
            "code": m["code"],
        }
        add_edge(nodes, edges, "course:higher", nid, "contains")
    for a, b in zip(majors, majors[1:]):
        add_edge(nodes, edges, f"foundation:{a['id']}", f"foundation:{b['id']}", "sequence")

    for t in foundations:
        if "." not in str(t["code"]):
            continue
        major_code = str(t["code"]).split(".")[0]
        major = next((m for m in majors if str(m["code"]) == major_code), None)
        nid = f"foundation-leaf:{t['id']}"
        nodes[nid] = {
            "id": nid,
            "title": t["title"],
            "blurb": f"Code {t['code']}",
            "era": "secondary",
            "courseId": "higher",
            "kind": "foundation-leaf",
            "requires": [],
            "unlocks": [],
            "href": f"/foundations#/{t['id']}",
            "motif": "numbers" if major_code == "1" else "algebra" if major_code == "3" else "shapes" if major_code == "4" else "dice" if major_code == "5" else "ruler",
            "code": t["code"],
            "topicId": t["id"],
        }
        foundation_leaves.append(nid)
        if major:
            add_edge(nodes, edges, f"foundation:{major['id']}", nid, "contains")

    # sequential within each foundation unit by code sort
    by_major: dict[str, list] = defaultdict(list)
    for t in foundations:
        if "." not in str(t["code"]):
            continue
        by_major[str(t["code"]).split(".")[0]].append(t)
    for code, items in by_major.items():
        items = sorted(items, key=lambda x: [int(p) if p.isdigit() else p for p in str(x["code"]).replace(".", " ").split()])
        seq_edges(nodes, edges, [f"foundation-leaf:{t['id']}" for t in items])

    # Track leaves
    track_by_course: dict[str, list] = defaultdict(list)
    for t in tracks:
        course = course_from_leaf_id(t["id"]) or "arithmetic"
        nid = f"track-leaf:{t['id']}"
        era = course_by_id.get(course, {}).get("era", "counting")
        nodes[nid] = {
            "id": nid,
            "title": t["title"],
            "blurb": f"Track {t.get('code', '')}",
            "era": era,
            "courseId": course,
            "kind": "track-leaf",
            "requires": [],
            "unlocks": [],
            "href": f"/track/{course}",
            "motif": COURSE_MOTIF.get(course, "shapes"),
            "code": t.get("code"),
            "topicId": t["id"],
        }
        track_by_course[course].append(t)
        if f"course:{course}" in nodes:
            add_edge(nodes, edges, f"course:{course}", nid, "contains")

    for course, items in track_by_course.items():
        # keep file order
        seq_edges(nodes, edges, [f"track-leaf:{t['id']}" for t in items])

    # Also fold outline additions leave order (already in tracks_topics for gaps)
    for course_key, outline in additions.items():
        if course_key.startswith("_") or not isinstance(outline, dict):
            continue
        ordered = []
        for unit in outline.get("units") or []:
            for top in unit.get("topics") or []:
                for lid in top.get("leaves") or []:
                    nid = f"track-leaf:{lid}"
                    if nid in nodes and nid not in ordered:
                        ordered.append(nid)
        seq_edges(nodes, edges, ordered)

    # Syllabus leaves (AA-HL)
    for leaf in syllabus["leaves"]:
        nid = f"syllabus-leaf:{leaf['id']}"
        nodes[nid] = {
            "id": nid,
            "title": leaf["title"],
            "blurb": f"Syllabus {leaf['code']}" + (" · HL" if leaf.get("hl") else ""),
            "era": "diploma",
            "courseId": "aa-hl",
            "kind": "syllabus-leaf",
            "requires": [],
            "unlocks": [],
            "href": f"/syllabus#/{leaf['id']}",
            "motif": "star",
            "code": leaf["code"],
            "hl": bool(leaf.get("hl")),
            "topicId": leaf["id"],
            "unitCode": leaf.get("unitCode"),
        }
        add_edge(nodes, edges, "course:aa-hl", nid, "contains")
        add_edge(nodes, edges, "course:aa-sl", nid, "bridge")

    by_unit: dict[str, list] = defaultdict(list)
    for leaf in syllabus["leaves"]:
        by_unit[str(leaf.get("unitCode"))].append(leaf)
    for unit, items in by_unit.items():
        items = sorted(items, key=lambda x: str(x["code"]))
        seq_edges(nodes, edges, [f"syllabus-leaf:{t['id']}" for t in items])
        # unit order bridges: last of unit N -> first of unit N+1 handled via unit sort below
    unit_order = sorted(by_unit.keys(), key=lambda x: int(x) if str(x).isdigit() else 99)
    for a, b in zip(unit_order, unit_order[1:]):
        if by_unit[a] and by_unit[b]:
            la = sorted(by_unit[a], key=lambda x: str(x["code"]))[-1]
            fb = sorted(by_unit[b], key=lambda x: str(x["code"]))[0]
            add_edge(nodes, edges, f"syllabus-leaf:{la['id']}", f"syllabus-leaf:{fb['id']}", "unit")

    # Skill topics + items
    skill_topic_ids = []
    for topic in sorted(skills["topics"], key=lambda t: t.get("order", 0)):
        nid = f"skill-topic:{topic['id']}"
        nodes[nid] = {
            "id": nid,
            "title": topic["title"],
            "blurb": topic.get("blurb") or "",
            "era": "bridge",
            "courseId": "higher",
            "kind": "skill-topic",
            "requires": [],
            "unlocks": [],
            "href": f"/practice/?skill={topic['id']}&mode=practice",
            "motif": SKILL_MOTIF.get(topic["id"], "calculator"),
            "hlLink": topic.get("hlLink"),
            "skillId": topic["id"],
        }
        skill_topic_ids.append(nid)
        add_edge(nodes, edges, "course:higher", nid, "contains")
        # cross-link toward AA-HL
        add_edge(nodes, edges, nid, "course:aa-hl", "prepares")
        add_edge(nodes, edges, nid, "course:aa-sl", "prepares")


    # Specialty dojos
    for did, title, era, motif, href in [
        ("algebra-dojo", "Algebra Dojo", "secondary", "algebra", "/dojo/algebra/"),
        ("integrals-dojo", "Integrals Dojo", "university", "graph", "/dojo/integrals/"),
    ]:
        nid = f"dojo:{did}"
        nodes[nid] = {
            "id": nid,
            "title": title,
            "blurb": "Specialty training dojo — triple-play + SRS.",
            "era": era,
            "courseId": "higher" if "algebra" in did else "calculus",
            "kind": "dojo",
            "requires": [],
            "unlocks": [],
            "href": href,
            "motif": motif,
            "skillId": did,
        }
        if f"course:{nodes[nid]['courseId']}" in nodes:
            add_edge(nodes, edges, f"course:{nodes[nid]['courseId']}", nid, "contains")

    seq_edges(nodes, edges, skill_topic_ids)

    items_by_topic: dict[str, list] = defaultdict(list)
    for item in skills["items"]:
        # id like indices-1
        tid = item["id"].rsplit("-", 1)[0]
        items_by_topic[tid].append(item)

    for tid, items in items_by_topic.items():
        topic_nid = f"skill-topic:{tid}"
        item_nids = []
        for item in items:
            nid = f"skill-item:{item['id']}"
            nodes[nid] = {
                "id": nid,
                "title": item["id"].replace("-", " · "),
                "blurb": (item.get("prompt") or "")[:120],
                "era": "bridge",
                "courseId": "higher",
                "kind": "skill-item",
                "requires": [],
                "unlocks": [],
                "href": f"/practice/?skill={tid}&mode=practice",
                "motif": SKILL_MOTIF.get(tid, "check"),
                "skillId": tid,
                "itemId": item["id"],
            }
            item_nids.append(nid)
            if topic_nid in nodes:
                add_edge(nodes, edges, topic_nid, nid, "contains")
        seq_edges(nodes, edges, item_nids)

    # Cross-links: foundations before aa-hl / algebra before functions already via course requires
    # Link last arithmetic leaf into prealgebra course etc. (course requires already cover hubs)
    if "foundation-leaf:pre-3.28" in nodes and "course:aa-sl" in nodes:
        add_edge(nodes, edges, "foundation-leaf:pre-3.28", "course:aa-sl", "prepares")
    if "course:functions" in nodes and "skill-topic:functions" in nodes:
        add_edge(nodes, edges, "skill-topic:functions", "course:functions", "aligns")
    if "skill-topic:trig" in nodes and "course:trigonometry" in nodes:
        add_edge(nodes, edges, "skill-topic:trig", "course:trigonometry", "aligns")

    # Layout hints: column = era index, row stack within course
    era_index = {e["id"]: i for i, e in enumerate(eras)}
    layout_rows: dict[str, int] = defaultdict(int)

    def place(n):
        era = n.get("era") or "counting"
        col = era_index.get(era, 0)
        # sub-column offset by kind
        kind_bias = {
            "era": -1,
            "course": 0,
            "foundation": 1,
            "foundation-leaf": 2,
            "track-leaf": 2,
            "syllabus-leaf": 2,
            "skill-topic": 1,
            "skill-item": 2,
        }.get(n["kind"], 2)
        key = f"{era}:{n.get('courseId')}:{kind_bias}"
        row = layout_rows[key]
        layout_rows[key] = row + 1
        n["col"] = col
        n["sub"] = kind_bias
        n["row"] = row
        n["courseRow"] = course_by_id.get(n.get("courseId") or "", {}).get("row", 0)

    for n in nodes.values():
        place(n)

    # Counts
    by_kind = defaultdict(int)
    for n in nodes.values():
        by_kind[n["kind"]] += 1

    out = {
        "version": 1,
        "generatedBy": "tools/build_skills_tree.py",
        "eras": eras,
        "motifs": sorted(set(COURSE_MOTIF.values()) | set(SKILL_MOTIF.values()) | set(KIND_MOTIF.values()) | {"lock", "check", "star", "hub"}),
        "nodes": list(nodes.values()),
        "edges": edges,
        "stats": {
            "nodeCount": len(nodes),
            "edgeCount": len(edges),
            "byKind": dict(by_kind),
        },
    }
    OUT.write_text(json.dumps(out, indent=2) + "\n")
    print(f"Wrote {OUT}")
    print(json.dumps(out["stats"], indent=2))


if __name__ == "__main__":
    main()
