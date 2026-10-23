import sys
import json
from pathlib import Path

# Force UTF-8 stdout
if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def main():
    print("🚀 INICIANDO CONSTRUCCIÓN DEL GRAFO DE CONOCIMIENTO (GRAPHIFY)...")

    from graphify.detect import detect
    from graphify.extract import collect_files, extract
    from graphify.build import build_from_json
    from graphify.cluster import cluster, score_all
    from graphify.analyze import god_nodes, surprising_connections, suggest_questions
    from graphify.report import generate
    from graphify.export import to_json, to_html

    out_dir = Path("graphify-out")
    out_dir.mkdir(exist_ok=True)

    # 1. Detección
    print("[1/5] Detectando archivos del repositorio y contexto histórico...")
    detection = detect(Path("."))
    (out_dir / ".graphify_detect.json").write_text(json.dumps(detection, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  ✓ Detectados {detection['total_files']} archivos (~{detection['total_words']:,} palabras)")

    # 2. Recolección de archivos relevantes (código + documentos de contexto)
    print("[2/5] Recolectando archivos de código, esquemas SQL y contexto de conversaciones...")
    code_and_doc_files = []
    ignored_substrings = ["node_modules", "tools\\graphify", "tools/graphify", "graphify-out", ".git\\", ".git/"]

    all_candidate_files = []
    for cat in ["code", "document"]:
        for f in detection.get("files", {}).get(cat, []):
            all_candidate_files.append(Path(f))

    for f in all_candidate_files:
        f_str = str(f)
        if not any(ign in f_str for ign in ignored_substrings):
            if f.is_file():
                code_and_doc_files.append(f)
            elif f.is_dir():
                code_and_doc_files.extend(collect_files(f))

    print(f"  ✓ Total archivos a indexar en el grafo: {len(code_and_doc_files)}")

    # 3. Extracción estructural AST (parallel=False for stable Windows execution)
    print("[3/5] Extrayendo nodos estructurales, dependencias y referencias...")
    result = extract(code_and_doc_files, cache_root=Path("."), parallel=False)
    (out_dir / ".graphify_ast.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  ✓ Extraídos {len(result.get('nodes', []))} nodos y {len(result.get('edges', []))} relaciones.")

    # Consolidar extracción
    merged = {
        "nodes": result.get("nodes", []),
        "edges": result.get("edges", []),
        "hyperedges": [],
        "input_tokens": 0,
        "output_tokens": 0
    }
    (out_dir / ".graphify_extract.json").write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")

    # 4. Construcción del grafo y clustering
    print("[4/5] Construyendo grafo de conocimiento, clustering de comunidades y análisis de nodos centrales...")
    G = build_from_json(merged, root=".", directed=False)
    if G.number_of_nodes() == 0:
        print("ERROR: El grafo quedó vacío.")
        sys.exit(1)

    communities = cluster(G)
    cohesion = score_all(G, communities)
    gods = god_nodes(G)
    surprises = surprising_connections(G, communities)

    # Asignar etiquetas semánticas a las comunidades
    labels = {}
    for cid, nodes in communities.items():
        node_str = " ".join([str(n) for n in nodes[:5]]).lower()
        if any(k in node_str for k in ["sancion", "multa", "debido_proceso"]):
            labels[cid] = "Sancionatorio & Debido Proceso (Art. 86)"
        elif any(k in node_str for k in ["tax", "factur", "1106", "dian"]):
            labels[cid] = "Facturación DIAN & 5% Obra (Ley 1106)"
        elif any(k in node_str for k in ["tech", "ai", "sla", "software", "multiplicador"]):
            labels[cid] = "Software, Consultoría & Servicios de IA"
        elif any(k in node_str for k in ["anticip", "fiducia", "1474"]):
            labels[cid] = "Anticipos & Manejo Fiducia (Ley 1474)"
        elif any(k in node_str for k in ["supervis", "interventor", "nsr", "bitacora"]):
            labels[cid] = "Supervisión, Interventoría & NSR-10"
        elif any(k in node_str for k in ["liquidac", "cierre", "balance", "amparo"]):
            labels[cid] = "Liquidación Final de Contratos (Art. 60)"
        elif any(k in node_str for k in ["equilibrio", "reclamac", "imprevis"]):
            labels[cid] = "Equilibrio Económico & Imprevisión"
        elif any(k in node_str for k in ["k_residual", "capacidad", "residual"]):
            labels[cid] = "Capacidad Residual K_R de Obra"
        elif any(k in node_str for k in ["competencia", "hhi", "contratista"]):
            labels[cid] = "Inteligencia Competitiva & HHI"
        elif any(k in node_str for k in ["paa", "adquisicion"]):
            labels[cid] = "Planes Anuales de Adquisición (PAA)"
        elif any(k in node_str for k in ["telegram", "alerta", "bot"]):
            labels[cid] = "Telegram Bot & Notificaciones Push"
        elif any(k in node_str for k in ["conversac", "hito", "brain", "historial"]):
            labels[cid] = "Memoria Histórica & Conversaciones"
        elif any(k in node_str for k in ["apu", "costo", "material"]):
            labels[cid] = "Análisis de Precios Unitarios (APU)"
        elif any(k in node_str for k in ["auth", "usuario", "jwt", "tenant"]):
            labels[cid] = "Autenticación SaaS & Multi-Tenancy"
        elif any(k in node_str for k in ["secop", "scanner", "proceso"]):
            labels[cid] = "Scraper SECOP II & Matching"
        else:
            labels[cid] = f"Módulo y Arquitectura {cid}"

    questions = suggest_questions(G, communities, labels)
    tokens = {"input": 0, "output": 0}

    report = generate(G, communities, cohesion, labels, gods, surprises, detection, tokens, ".", suggested_questions=questions)
    (out_dir / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    (out_dir / ".graphify_labels.json").write_text(json.dumps({str(k): v for k, v in labels.items()}, ensure_ascii=False), encoding="utf-8")

    to_json(G, communities, "graphify-out/graph.json", community_labels=labels)
    print(f"  ✓ Grafo construido: {G.number_of_nodes()} nodos, {G.number_of_edges()} relaciones, {len(communities)} comunidades.")

    # 5. Exportación HTML
    print("[5/5] Generando visualizador interactivo graphify-out/graph.html...")
    to_html(G, communities, "graphify-out/graph.html", community_labels=labels)

    print("\n==========================================================================")
    print("🎉 CONSTRUCCIÓN EXITOSA DEL GRAFO DE CONOCIMIENTO!")
    print(f"• Archivo interactivo HTML:   {out_dir / 'graph.html'}")
    print(f"• Datos completos del grafo:  {out_dir / 'graph.json'}")
    print(f"• Reporte y auditoría:        {out_dir / 'GRAPH_REPORT.md'}")
    print("==========================================================================")

if __name__ == "__main__":
    main()
