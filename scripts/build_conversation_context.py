import json
import sys
from pathlib import Path
import shutil

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

target_dir = Path('docs/contexto_conversaciones')
target_dir.mkdir(parents=True, exist_ok=True)

brain_dir = Path(r'C:\Users\nikyl\.gemini\antigravity\brain\bdb78704-d658-4df3-a912-d8c00e521f2d')

# 1. Copiar artefactos fundamentales del cerebro
for fname in ['plan_maestro_modulo_ti_ia.md', 'radar_secop_nikadu_ia.md', 'memoria_despliegue_vps.md']:
    src = brain_dir / fname
    if src.exists():
        shutil.copy2(src, target_dir / fname)
        print(f'[OK] Copiado artefacto: {fname} a {target_dir}')

# 2. Parsear el transcript completo de interacciones
transcript_path = brain_dir / '.system_generated' / 'logs' / 'transcript.jsonl'
milestones = []
if transcript_path.exists():
    with open(transcript_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get('type') == 'USER_INPUT':
                    content = data.get('content', '')
                    if '<USER_REQUEST>' in content:
                        req = content.split('<USER_REQUEST>')[1].split('</USER_REQUEST>')[0].strip()
                    else:
                        req = content.strip()
                    if req and len(req) > 1:
                        milestones.append({
                            'step': data.get('step_index', 0),
                            'created_at': data.get('created_at', ''),
                            'user_request': req
                        })
            except Exception as e:
                pass

report_lines = [
    '# Memoria Viva y Contexto Histórico del Proyecto Radar SECOP\n',
    'Este documento consolida la trazabilidad de requerimientos, decisiones de diseño, marcos jurídicos y evolución técnica discutidos a lo largo de las sesiones del proyecto Radar SECOP (NIKADU IA).\n',
    '## 1. Identidad y Misión del Sistema',
    '- **Nombre:** Radar SECOP B2B SaaS (NIKADU IA).',
    '- **Naturaleza:** Plataforma de inteligencia artificial para búsqueda, postulación, adjudicación y gestión contractual en SECOP II Colombia.',
    '- **Capacidades Principales:**',
    '  - Monitoreo en tiempo real de convocatorias SECOP II con alertas vía Telegram Bot.',
    '  - Ponderación económica Monte Carlo bajo Concepto C-382/2020 de Colombia Compra Eficiente (CCE).',
    '  - Análisis de Precios Unitarios (APU) e ingeniería de costos.',
    '  - Capacidad Residual K_R según Pliegos Tipo para Obra Civil e Infraestructura.',
    '  - Cockpit Contractual 360° post-adjudicación (Anticipos & Fiducia Ley 1474, Reclamaciones Económicas e Imprevisión, Liquidación Final Art. 60 Ley 80, Interventoría NSR-10/SPI, Debido Proceso Sancionatorio Art. 86 Ley 1474, y Facturación DIAN con 5% Ley 1106).',
    '  - Suite Especializada de Software, Consultoría & Servicios de IA (Factor Multiplicador CCE 1.920x, cómputo cloud GPUs, tokens LLM, SLAs de Uptime 99.9%, y Concurso de Méritos Ley 1150).\n',
    '## 2. Marco Normativo y Legal de Colombia Aplicado en el Código',
    '1. **Ley 80 de 1993:** Principios de contratación estatal, equilibrio económico (Art. 27), liquidación de mutuo acuerdo y unilateral (Art. 60).',
    '2. **Ley 1150 de 2007:** Modalidades de selección, Concurso de Méritos para consultoría y software complejo.',
    '3. **Ley 1474 de 2011 (Estatuto Anticorrupción):** Artículo 86 para debido proceso de multas con tope del 10%; Artículo 91 para manejo fiduciario de anticipos.',
    '4. **Ley 1882 de 2018:** Pliegos tipo, reglas estrictas de subsanabilidad y límites de adendas.',
    '5. **Ley 1106 de 2006:** Contribución especial del 5% exclusiva para obras públicas (NO aplicable a tecnología).',
    '6. **Estatuto Tributario (Art. 476 Num 23 y 24):** Exclusión expresa de IVA para servicios de cloud computing y desarrollo de software.',
    '7. **Ley 23 de 1982 y Ley 1450 de 2011:** Régimen de propiedad intelectual con cesión de derechos patrimoniales al Estado y conservación de derechos morales.\n',
    '## 3. Registro Cronológico de Conversaciones y Requerimientos del Usuario\n'
]

for idx, m in enumerate(milestones, 1):
    report_lines.append(f'### Hito {idx} - Interacción (Paso {m["step"]})')
    if m["created_at"]:
        report_lines.append(f'*Fecha / Hora:* `{m["created_at"]}`\n')
    report_lines.append('**Petición del Usuario:**\n```text\n' + m["user_request"] + '\n```\n')

doc_path = target_dir / 'historial_conversaciones_radar_secop.md'
doc_path.write_text('\n'.join(report_lines), encoding='utf-8')
print(f'[OK] Generado documento de contexto con {len(milestones)} interacciones historicas: {doc_path}')
