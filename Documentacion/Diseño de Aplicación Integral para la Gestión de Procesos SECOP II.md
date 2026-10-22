### Informe Técnico: Arquitectura, Diseño Funcional y Especificación de Módulos para Plataforma Software de Gestión Integral de Licitaciones Públicas en Colombia (SECOP II / Licitando.ai)

##### 1\. ARQUITECTURA Y VISIÓN GENERAL DEL SISTEMA

###### *Contexto e Importancia Estratégica*

La gestión de compras públicas en Colombia atraviesa una transformación estructural hacia la digitalización transaccional y la estandarización analítica. En este escenario, la participación eficiente en procesos de selección estatal exige trascender la operatividad analógica y reactiva para consolidar una ventaja competitiva basada en Inteligencia Artificial, analítica predictiva de datos y auditoría de cumplimiento normativo en tiempo real. La densidad procedimental de la contratación estatal en Colombia —caracterizada por un volumen masivo de pliegos, adendas y exigencias jurisprudenciales cambiantes— requiere una plataforma de software empresarial capaz de ingerir e interpretar de manera automatizada la información contractual del Estado, reducir a cero el margen de error humano en la preparación de ofertas y diagnosticar con máxima precisión la capacidad habilitante jurídica, financiera, organizacional y técnica de los proponentes.

###### *Misión y Propósito del Sistema*

El propósito arquitectónico central del sistema es blindar jurídicamente a los oferentes y mitigar integralmente el riesgo operativo y de rechazo expreso de propuestas en la contratación pública. Inspirada en la visión funcional de  *Licitando.ai* , la plataforma adopta un patrón de diseño holístico que articula la ingesta documental asistida por visión artificial y procesamiento de lenguaje natural (NLP), la auditoría predictiva de pliegos de condiciones (borradores, definitivos y Pliegos Tipo) y el monitoreo dinámico a lo largo de todas las fases del ciclo contractual estatal. El sistema convierte la complejidad normativa y la dispersión de datos en un flujo de trabajo estructurado, automatizado, determinista y auditable.

###### *Ecosistema de Integración Novedosa de Datos y Arquitectura de Ingesta*

Para garantizar un rendimiento de grado empresarial, la plataforma se estructura sobre un patrón de  **Arquitectura Orientada a Eventos y Microservicios (Event-Driven Microservices Architecture)**  expuesta a través de un  **API Gateway**  centralizado. El sistema coordina procesos asíncronos de extracción, transformación y carga (ETL) que procesan ingestas masivas desde el Sistema Electrónico para la Contratación Pública (SECOP II) y bases de datos institucionales.  
La ingesta masiva se canaliza mediante colas de mensajes distribuidas ( **Apache Kafka / RabbitMQ** ), alimentando un almacén transaccional operacional en  **PostgreSQL**  para la gestión de estados y un clúster indexado en  **Elasticsearch y Base de Datos Vectorial**  para la búsqueda semántica e identificación de precedentes en la doctrina de la Agencia Nacional de Contratación Pública \- Colombia Compra Eficiente (ANCP-CCE). Este ecosistema da cumplimiento estricto a los lineamientos del  **Decreto 003 de 2025** , el cual mandata la actualización e interoperabilidad entre plataformas de contratación pública.  
Fuente de Datos,Tipo de Información Integrada,Impacto Técnico/Funcional en la Plataforma  
SECOP II (Datos Abiertos \- API SODA REST y Plataforma Transaccional),"Datos Abiertos de procesos licitatorios, pliegos de condiciones, borradores, anexos técnicos, presupuestos oficiales, actas de evaluación y cronogramas institucionales.","Automatización de worker queues asíncronos para monitoreo en tiempo real mediante SODA REST API, alertas preventivas e interoperabilidad bajo los estándares del Decreto 003 de 2025."  
Registro Único de Proponentes (RUP via Cámaras de Comercio),"Certificados RUP con capacidad jurídica, financiera, organizacional y experiencia acreditada en códigos UNSPSC (Ley 1150 de 2007, Art. 6.1).","Ingesta y validación digital en línea aprovechando la gratuidad y conectividad directa de entidades (Decreto Ley 019 de 2012, Art. 15 / Ley 1450 de 2011, Art. 227\) para verificación continua de firmeza e indicadores."  
Planes Anuales de Adquisiciones (PAA),"Proyecciones anuales de compras publicadas por entidades estatales del orden nacional, departamental y municipal.",Alimentación del motor de  matching  predictivo para la identificación de oportunidades de negocio antes de la emisión de borradores de pliego.  
Doctrina y Jurisprudencia ANCP-CCE,"Conceptos unificados de la ANCP-CCE, manuales de requisitos habilitantes y resoluciones de Pliegos Tipo.","Calibración del motor de reglas jurídicas e indexación vectorial para la auditoría de subsanabilidad, prevención de causales de rechazo y evaluación de pliegos."

###### *Sustento Normativo y Marco Regulatorio*

El diseño conceptual, el motor de reglas de negocio y los flujos de validación del sistema están fundamentados en la evolución legislativa y reglamentaria del estatuto de contratación pública colombiano:

* **Ley 80 de 1993:**  Estatuto General de Contratación de la Administración Pública, cimiento de los principios de transparencia, economía, responsabilidad y selección objetiva (Art. 23, 25.15, 29).  
* **Ley 1150 de 2007:**  Regulación de modalidades de selección, uso obligatorio del SECOP, naturaleza del RUP como plena prueba (Art. 6.1) y mecanismo de impugnación o firmeza (Art. 6.3).  
* **Ley 1882 de 2018:**  Mandato de pliegos tipo (Art. 4\) y estandarización del régimen material y temporal de subsanabilidad de ofertas (Art. 5).  
* **Ley 2022 de 2020:**  Amplitud del mandato de pliegos tipo a otros sectores (obras públicas, interventoría, consultoría, bienes y servicios) bajo la facultad regulatoria de la ANCP-CCE.  
* **Ley 2069 de 2020 y Decreto 1860 de 2021:**  Criterios de diferenciación técnica, fomento a Mipymes y fomento de la competencia en pliegos estandarizados.  
* **Decreto 1082 de 2015:**  Decreto Único Reglamentario del Sector Planeación, marco técnico para la acreditación de condiciones habilitantes, renovación del RUP y fórmulas de indicadores financieros.  
* **Decreto 003 de 2025:**  Lineamientos de interoperabilidad tecnológica para la actualización automática y seguimiento a sistemas de contratación pública.

Esta arquitectura fundamentada normativamente permite que el sistema conecte la ingestión de datos abiertos con la gestión precisa del perfil individual del oferente en el Módulo 1\.

##### 2\. MÓDULO 1: GESTIÓN AUTOMATIZADA DEL RUP Y PERFIL FINANCIERO

###### *Contexto e Importancia Estratégica*

El Registro Único de Proponentes (RUP) es la prueba plena de las condiciones habilitantes de capacidad jurídica, financiera, organizacional y de experiencia de los oferentes en los procesos de selección estatal, conforme al artículo 6.1 de la Ley 1150 de 2007\. La automatización de su ingesta, la lectura de sus estados de firmeza y la correcta interpretación de su información contable son condiciones indispensables para garantizar habilitaciones impecables y evitar descalificaciones por caducidad o inconsistencia registral.

###### *Ingesta y Extracción Inteligente OCR/IA*

El módulo implementa un pipeline automatizado de procesamiento de archivos PDF. La extracción utiliza bibliotecas de análisis de texto vectorial nativo con un motor de respaldo OCR ( **Tesseract / Azure AI Document Intelligence** ) especializado y calibrado para la maquetación de certificados expedidos por las Cámaras de Comercio.  
\[Certificado RUP PDF\]  
        │  
        ▼  
\[Extractor de Texto Vectorial / OCR Engine (Azure AI / Tesseract)\]  
        │  
        ▼  
\[Parser Estructurado & NLP Entity Recognition\]  
   ├── Expresiones Contables ──► \[Tabla PostgreSQL: Indicadores Financieros\]  
   ├── Clasificador UNSPSC   ──► \[Tabla PostgreSQL: Matriz de Experiencia\]  
   └── Actos Administrativos  ──► \[Motor de Reglas: Estado de Firmeza\]

1. **Extracción Contable:**  Identificación de cuentas del balance general y estado de resultados (Activo Corriente, Activo Total, Pasivo Corriente, Pasivo Total, Patrimonio, Utilidad Operacional, Gastos de Intereses).  
2. **Clasificación de Experiencia:**  Indexación de cada contrato ejecutado reportado en el RUP, extrayendo el consecutivo, el valor expresado en Salarios Mínimos Mensuales Legales Vigentes (SMMLV) al momento de la terminación y los códigos del Clasificador de Bienes y Servicios de Naciones Unidas (UNSPSC).  
3. **Auditoría Histórica:**  Digitalización de los actos de inscripción, renovación y actualización para trazar la línea de vigencia registral.

###### *Análisis Normativo de Vigencias Fiscales e Indicadores Financieros*

El motor financiero evalúa la capacidad del proponente bajo los parámetros doctrinales vigentes de la ANCP-CCE:

* **Caducidad del "Mejor Año Fiscal":**  De acuerdo con el  **Concepto C-933 de 2026 de la ANCP-CCE** , la plataforma elimina cualquier regla de negocio que permita la libre elección de indicadores financieros entre los últimos tres (3) años. Las normas transitorias de los Decretos 399 de 2021 y 579 de 2021 perdieron aplicabilidad por  *sustracción de materia*  al fenecer los parágrafos transitorios del Decreto 1082 de 2015\.  
* **Evaluación Exclusiva del Último Año Fiscal:**  El sistema parametriza la evaluación de liquidez, endeudamiento, cobertura de intereses, capital de trabajo, ROE y ROA, evaluando únicamente la información del RUP vigente y en firme correspondiente al  **Último Año Fiscal**  (conforme a los numerales 1.3 y 2.3 del artículo 2.2.1.1.1.5.2 del Decreto 1082 de 2015).  
* **Tratamiento Especial para Sociedades Nuevas:**  Para empresas de reciente constitución que no cuenten con estados financieros cortados al 31 de diciembre del año anterior, el módulo parametriza la acreditación de la capacidad financiera mediante estados financieros de apertura o de corte trimestral debidamente inscritos en el RUP, según lo establecido en el  **Concepto C-837 de 2022**  y el Decreto 1082 de 2015\.

###### *Tablero de Control de Vencimientos, Firmeza y Gestión de Tiempos*

El sistema ejecuta un motor de reglas de negocio en tiempo real para monitorear las ventanas temporales del RUP:

* **Fecha Límite de Renovación:**  Emisión de alertas automáticas para garantizar la radicación de la renovación ante la Cámara de Comercio antes del quinto (5°) día hábil de abril de cada año (Decreto 1082 de 2015, Art. 2.2.1.1.1.5.1). El sistema aplica la regla doctrinal consolidada en los  **Conceptos C-525 de 2026 y C-423 de 2021** : la sola radicación oportuna de la solicitud impide la cesación de efectos del RUP. Durante el trámite de renovación, la plataforma valida que la información del RUP "antiguo" en firme sigue siendo legalmente plenamente oponible para participar en procesos licitatorios.  
* **Control del Término de Firmeza:**  Monitoreo del término de diez (10) días hábiles posteriores a la publicación del acto administrativo de inscripción, renovación o actualización por la Cámara de Comercio para la interposición de recursos de reposición (Ley 1150 de 2007, Numeral 6.3).  
* **Evaluación de Firmeza al Cierre:**  Regla de validación algorítmica previa a la firma de la propuesta que confirma si la información del RUP requerida está en firme a la fecha y hora exacta del cierre del proceso de selección ( **Concepto C-933 de 2026** ).  
* *Manejo de Caso Borde \- Inscripción Inicial Pendiente:*  Si el proponente presenta una inscripción inicial o una nueva inscripción por falta de renovación y esta no ha adquirido firmeza al cierre, el sistema  **bloquea la presentación**  por falta imperativa de capacidad legal ( **Concepto C-423 de 2021** ).  
* *Manejo de Caso Borde \- Actualización Pendiente:*  Si el proponente radicó una actualización que se encuentra en trámite o pendiente de firmeza al cierre, el sistema instruye evaluar la oferta utilizando de forma exclusiva la información previa en firme, sin descalificar la propuesta ( **Concepto C-933 de 2026** ).

Garantizada la solidez del perfil individual del RUP, la plataforma habilita el cómputo agrupado para la simulación de estructuras plurales.

##### 3\. MÓDULO 2: SIMULADOR DE ESTRUCTURAS PLURALES (CONSORCIOS Y UNIONES TEMPORALES) Y CALCULADORA DE K RESIDUAL

###### *Contexto e Importancia Estratégica*

Frente a licitaciones cuyos requerimientos financieros o de experiencia sobrepasan las capacidades individuales de una empresa, la contratación estatal colombiana permite la conformación de estructuras plurales (Consorcios, Uniones Temporales y Promesas de Sociedad Futura). El simulador del sistema evalúa la combinación ponderada de los estados financieros y experiencias para garantizar el cumplimiento de los pliegos de condiciones.

###### *Algoritmo de Agregación Contable y Modelación Financiera*

El algoritmo realiza la agregación matemática de las partidas contables y calcula los indicadores consolidados de la estructura plural. Dado un conjunto de  \$N\$  integrantes, donde cada integrante  \$i\$  posee un porcentaje de participación  \$\\%P\_i\$  (tal que  \$\\sum\_{i=1}^N \\%P\_i \= 100\\%\$ ), las fórmulas contables agregadas se definen de la siguiente manera:  
\===================================================================================  
FORMULACIÓN MATEMÁTICA DE AGREGACIÓN PLURAL  
\===================================================================================

Partidas Contables Agregadas Plurales:  
\- Activo Corriente Plural (ACP)       \= ∑\_{i=1}^{N} (Activo Corriente\_i)  
\- Pasivo Corriente Plural (PCP)       \= ∑\_{i=1}^{N} (Pasivo Corriente\_i)  
\- Activo Total Plural (ATP)           \= ∑\_{i=1}^{N} (Activo Total\_i)  
\- Pasivo Total Plural (PTP)           \= ∑\_{i=1}^{N} (Pasivo Total\_i)  
\- Patrimonio Plural (PATP)            \= ∑\_{i=1}^{N} (Patrimonio\_i)  
\- Utilidad Operacional Plural (UOP)   \= ∑\_{i=1}^{N} (Utilidad Operacional\_i)  
\- Gastos de Intereses Plurales (GIP)  \= ∑\_{i=1}^{N} (Gastos de Intereses\_i)

Indicadores Financieros y Organizacionales Consolidados:  
\- Índice de Liquidez Plural (ILP)     \= ACP / PCP   
                                      \= \[ ∑\_{i=1}^{N} (Activo Corriente\_i) \] / \[ ∑\_{i=1}^{N} (Pasivo Corriente\_i) \]

\- Índice de Endeudamiento Plural (IEP)= PTP / ATP   
                                      \= \[ ∑\_{i=1}^{N} (Pasivo Total\_i) \] / \[ ∑\_{i=1}^{N} (Activo Total\_i) \]

\- Cobertura de Intereses Plural (CIP) \= UOP / GIP   
                                      \= \[ ∑\_{i=1}^{N} (Utilidad Operacional\_i) \] / \[ ∑\_{i=1}^{N} (Gastos de Intereses\_i) \]

\- Capital de Trabajo Plural (CTP)     \= ACP \- PCP   
                                      \= ∑\_{i=1}^{N} (Activo Corriente\_i \- Pasivo Corriente\_i)

\- Rentabilidad del Patrimonio (ROE\_P) \= UOP / PATP   
                                      \= \[ ∑\_{i=1}^{N} (Utilidad Operacional\_i) \] / \[ ∑\_{i=1}^{N} (Patrimonio\_i) \]

\- Rentabilidad del Activo (ROA\_P)     \= UOP / ATP   
                                      \= \[ ∑\_{i=1}^{N} (Utilidad Operacional\_i) \] / \[ ∑\_{i=1}^{N} (Activo Total\_i) \]

Nota de Agregación de Participación (%P\_i):  
En acuerdos consorciales específicos donde la regla de la entidad evalúe aportes de capital   
o capacidad en función del porcentaje de participación asignado a cada miembro, el componente   
ponderado equivalente se calcula como:  
\- Componente\_i Ponderado \= Variable\_i × (%P\_i / 100\)  
\===================================================================================

###### *Motor de Optimización Algorítmica de Participación*

El sistema incorpora un motor de optimización basada en restricciones ( *Constraint Satisfaction Problem \- CSP* ). Ante una condición del pliego donde la suma simple o la distribución inicial resulta en "No Cumple" para un indicador (por ejemplo, Cobertura de Intereses o Capital de Trabajo), el algoritmo resuelve la matriz de distribución porcentual óptima ( \$\\%P\_A, \\%P\_B, \\dots, \\%P\_N\$ ), sugiriendo la redistribución mínima requerida para pasar a estado "Cumple", reduciendo la exposición del socio principal y optimizando el reparto de la experiencia aportada.

###### *Calculadora Avanzada de Capacidad Residual (K) para Obra Pública*

Para licitaciones de obra pública regidas por los Pliegos Tipo de la ANCP-CCE, la plataforma ejecuta el cálculo de la Capacidad Residual de Contratación ( \$K\_R\$ ). El modelo aplica la ecuación oficial estandarizada:  
\$\$K\_R \= CO \+ E \+ CT \+ CF \- SCE\$\$  
Factor del K Residual,Símbolo y Variable,Mecanismo de Acreditación y Fuente de Datos  
Capacidad Operativa,\$CO\$,Calculada a partir del Activo Corriente y Patrimonio reportados en el RUP (Último Año Fiscal). Refleja la liquidez operacional y escala patrimonial.  
Experiencia,\$E\$,"Extracción de los mejores contratos de obra pública registrados en el RUP en códigos UNSPSC del sector construcción, expresados en SMMLV."  
Capacidad Técnica,\$CT\$,Evaluación ponderada de la nómina de personal técnico y profesional de ingeniería/arquitectura acreditado documentalmente por el oferente.  
Capacidad Financiera,\$CF\$,"Factor derivado de los índices financieros del RUP (Liquidez, Endeudamiento y Cobertura de Intereses)."  
Saldos de Contratos en Ejecución,\$SCE\$,"Matriz que audita los contratos de obra pública en ejecución (individuales y en estructura plural) al cierre del proceso, restando el saldo pendiente por ejecutar."  
El valor resultante ( \$K\_R\$ ) es comparado de forma automatizada contra el Presupuesto Oficial o el  \$K\$  exigido en el pliego para determinar la habilitación de la propuesta de ingeniería.  
Esta capacidad analítica y de balance contable alimenta el Módulo 3 de prospección comercial.

##### 4\. MÓDULO 3: INTELIGENCIA COMERCIAL Y SEGUIMIENTO DEL PLAN ANUAL DE ADQUISICIONES (PAA)

###### *Contexto e Importancia Estratégica*

Convertir la contratación pública en un canal de venta predecible requiere migrar de la búsqueda reactiva en licitaciones abiertas hacia una estrategia de inteligencia comercial anticipatoria, basada en la minería de datos sobre los Planes Anuales de Adquisiciones (PAA) de las entidades del Estado.

###### *Minería de Datos y Rastreo Continuo de PAAs*

El módulo ejecuta procesos de extracción automatizada ( *cron jobs* ) que consumen los datasets de PAAs publicados por las entidades estatales en el portal de Datos Abiertos de SECOP II a través de la  **API SODA REST** . La información es normalizada e indexada en la base de datos analítica del sistema, mapeando códigos UNSPSC, modalidades de selección proyectadas, valor estimado del contrato y mes previsto de publicación de pliegos.

###### *Engine de Matching Predictivo*

El algoritmo de recomendación comercial calcula un puntaje de compatibilidad ( *Match Score* ) de tres factores para cada oportunidad detectada:  
\$\$\\text{Score}*{\\text{Match}} \= w\_1 \\cdot \\text{Sim}*{\\text{UNSPSC}} \+ w\_2 \\cdot \\text{Fit}*{\\text{Financial}} \+ w\_3 \\cdot \\text{Proximity}*{\\text{Geo}}\$\$  
\[Datos Abiertos PAA \- API SODA REST\]  
                 │  
                 ▼  
     \[Engine de Matching Predictivo\]  
   ┌─────────────┼──────────────┐  
   │             │              │  
\[UNSPSC Match\] \[Fit Financiero\] \[Geo Proximidad\]  
   │             │              │  
   └─────────────┼──────────────┘  
                 ▼  
       \[Matching Score Final\]  
                 │  
                 ▼  
  \[Calendario Preventivo / Alertas\]

1. **Cruce UNSPSC (**  **\$\\text{Sim}\_{\\text{UNSPSC}}**\$  **):**  Ponderación de coincidencias entre los códigos de producto/servicio del PAA y los códigos UNSPSC acreditados en el RUP del usuario.  
2. **Capacidad Financiera y**  **\$K**\$  **Residual (**  **\$\\text{Fit}\_{\\text{Financial}}**\$  **):**  Evaluación de la viabilidad de la cuantía proyectada frente al capital de trabajo del oferente o su  \$K\_R\$  proyectado.  
3. **Proximidad Geográfica (**  **\$\\text{Proximity}\_{\\text{Geo}}**\$  **):**  Ponderación del departamento/municipio de la contratación frente al domicilio o histórico operacional del proponente.

###### *Calendario Preventivo de Adquisiciones*

El módulo consolida los resultados en un cronograma predictivo que alerta al usuario semanas o meses antes del lanzamiento del Borrador de Pliegos. Esto otorga una ventaja temporal crítica para estructurar alianzas consorciales, gestionar cupos de garantías de seriedad y preparar la documentación técnica.  
La identificación oportuna de estos procesos se conecta directamente con el Módulo 4 para la auditoría profunda de pliegos.

##### 5\. MÓDULO 4: AUDITORÍA DE PLIEGOS Y EVALUACIÓN DE REQUISITOS HABILITANTES CON IA

###### *Contexto e Importancia Estratégica*

La revisión de estudios previos, pliegos definitivos y Pliegos Tipo suele ser vulnerable al sesgo y al error humano. Automatizar la lectura crítica mediante procesamiento de lenguaje natural permite diagnosticar objetivamente si un oferente cumple con las exigencias de un proceso de selección.

###### *Analizador Inteligente de Documentación Contractual*

El sistema integra un analizador de documentos basado en modelos NLP y extracción semántica, entrenado en la estructura de los Pliegos Tipo de la ANCP-CCE (Infraestructura de Transporte, Infraestructura Social, Agua Potable y Saneamiento Básico, Catastro Multipropósito, etc.). El analizador descompone el pliego en variables cuantificables de capacidad habilitante y reglas de ponderación.

###### *Matriz de Brechas (Gap Analysis) en Tiempo Real*

El motor evalúa de forma simultánea cuatro ejes de habilitación:

* **Capacidad Jurídica y RUP en firme:**  Verificación del objeto social, facultades cuantificadas del representante legal y vigencia del RUP al cierre.  
* **Capacidad Financiera y Organizacional:**  Contraste automático entre los umbrales exigidos en el pliego y los indicadores del RUP del oferente para el Último Año Fiscal.  
* **Experiencia Específica y Restricciones Sectoriales:**  Validación de los SMMLV exigidos, códigos UNSPSC clave y número máximo de contratos permitidos. Para infraestructura social en el sector educativo ( **Resolución 220 de 2021 de la ANCP-CCE** ), el módulo parametriza la definición de "edificación" y aplica de manera estricta las  **cuatro exclusiones normativas**  establecidas en la doctrina unificada del  **Concepto C-410 de 2022** :  
* *Exclusión 1:*  Parqueaderos de un solo piso.  
* *Exclusión 2:*  Obras de infraestructura de transporte externa (vías de acceso fuera de la institución educativa, salvo vías de circulación interna).  
* *Exclusión 3:*  Obras hidráulicas.  
* *Exclusión 4:*  Obras de urbanismo y paisajismo (salvo que constituyan el mantenimiento directo de zonas verdes pertenecientes a una edificación social).  
* **Capacidad Residual (**  **\$K**\$  **):**  Verificación de la suficiencia del  \$K\_R\$  frente al  \$K\$  exigido para la licitación de obra pública.

###### *Matriz Semáforo Prototípica*

La salida visual consolida el diagnóstico habilitante en una matriz estructurada:  
Requisito del Pliego,Criterio Exigido,Valor / Estado del Oferente,Resultado Semáforo (Cumple / Subsanable / No Cumple),Sustento Probatorio / Observación  
Índice de Liquidez,\$\\ge 1.5\$,\$1.85\$,Cumple,RUP del Último Año Fiscal en firme.  
Capital de Trabajo,\$\\ge \\\$500.000.000\$,\$\\\$420.000.000\$,No Cumple,Requiere estructuración plural en Módulo 2 para agregar patrimonio/liquidez de un socio.  
Firmeza del RUP,Vigente y en firme al cierre,Solicitud de renovación radicada el 2° día hábil de abril,Cumple,Aplica doctrina de continuidad de efectos del RUP previo (Conceptos C-525 de 2026 y C-423 de 2021).  
Experiencia Específica,\$2.000\\text{ SMMLV}\$  en UNSPSC 72121100 (Construcción de Edificaciones),\$2.300\\text{ SMMLV}\$  en 2 contratos reportados,Cumple,Cumple con la noción de edificación vertical. Sin causales de exclusión del Concepto C-410 de 2022\.  
Garantía de Seriedad,Requisito obligatorio adjunto a la oferta,Póliza emitida pero no cargada en el sobre inicial,Subsanable,La póliza fue expedida antes del cierre (Hecho preexistente). Documento subsanable según Concepto C-1376 de 2025\.  
Cuando la matriz identifica hallazgos o brechas subsanables, activa los recursos del Módulo 5 para la prevención de rechazo.

##### 6\. MÓDULO 5: ASISTENTE JURÍDICO DE SUBSANABILIDAD Y PREVENCIÓN DE RECHAZO

###### *Contexto e Importancia Estratégica*

El régimen de subsanabilidad en Colombia (Ley 1882 de 2018, Art. 5; Ley 1150 de 2007, Art. 5 Parágrafos 1 y 3\) materializa el principio de prevalencia del derecho sustancial sobre el formal (Ley 80 de 1993, Art. 25.15 y Constitución Política, Art. 228). El asistente jurídico analiza las observaciones del informe de evaluación para aplicar la doctrina unificada de la ANCP-CCE y evitar descalificaciones ilegales.

###### *Clasificación Automatizada del Régimen de Subsanabilidad*

Fundamentado en la línea doctrinal de la ANCP-CCE ( **Conceptos C-057 de 2026, C-1376 de 2025, C-518 de 2025 y C-431 de 2026** ), el motor legal aplica la siguiente clasificación de reglas:

* **Regla General de Subsanabilidad:**  Todo requisito habilitante o documento de la propuesta que  **no afecte la asignación de puntaje**  es subsanable. La entidad estatal TIENE EL DEBER de solicitarlo y el proponente tiene el derecho de aportarlo hasta el vencimiento del traslado del informe de evaluación ( **Concepto C-518 de 2025** ). El sistema integra la regla de  **reorganización documental**  del  **Concepto C-431 de 2026** : si un contrato aportado inicialmente para puntaje técnico no es valorado en dicha categoría, es legalmente válido solicitar en la subsanación que sea reclasificado para cumplir la experiencia habilitante, siempre que la oferta inicial contuviera el documento y no se agregue información nueva.  
* **Límite Temporal:**  La entrega de documentos subsanables vence con el término de traslado del informe de evaluación de la respectiva modalidad. (Se exceptúan la Mínima Cuantía y la Subasta Pública, donde el límite es el momento previo a la puja o adjudicación).  
* **Límite Material (Distinción entre Hecho y Prueba):**  La ley prohíbe acreditar "circunstancias ocurridas con posterioridad al cierre". El motor legal aplica de forma estricta la distinción entre el  **HECHO**  material y la  **PRUEBA**  documental ( **Concepto C-1376 de 2025** ): el HECHO (la existencia del contrato, la vigencia del RUP, la capacidad jurídica) debe ser previo al cierre del proceso; la PRUEBA (el certificado, la copia o la aclaración) puede tener fecha posterior al cierre, siempre que certifique la circunstancia preexistente.

###### *Motor Preventivo de Causales Insubsanables y Rechazo Expreso*

El módulo emite alertas de rechazo inmediato si detecta alguna de las siguientes causales insubsanables:

* **No entrega de la Garantía de Seriedad de la Oferta:**  La ausencia total de la garantía de seriedad adjunta a la propuesta inicial es insubsanable y genera el rechazo de la oferta por disposición del Parágrafo 3 del Art. 5 de la Ley 1882 de 2018 ( **Conceptos C-1376 de 2025 y C-518 de 2025** ).  
* **Falta de Firmeza o Inscripción Inexistente del RUP al Cierre:**  Si el oferente no contaba con RUP en firme al cierre por no haber renovado antes del 5° día hábil de abril e inició una "nueva inscripción" cuya firmeza se dio con posterioridad al cierre, la propuesta es insubsanable y debe ser rechazada ( **Concepto C-423 de 2021** ).  
* **Acreditación de Requisitos de Puntaje fuera de la Oferta Inicial:**  Prohibición de aportar, completar o mejorar documentos destinados a la asignación de puntaje técnico o comercial una vez vencido el plazo de presentación de ofertas.

###### *Generador Asistido de Documentación Jurídica*

El módulo cuenta con un motor de plantillas dinámicas ( **Jinja2 / Docx Engine** ) que genera documentos legales parametrizados con los identificadores del proceso de SECOP II y las citas jurisprudenciales aplicables:

1. **Cartas de Subsanación Documental:**  Respuesta al informe de evaluación respondiendo a los requerimientos de la entidad dentro del término de traslado.  
2. **Observaciones al Borrador de Pliegos:**  Escritos para controvertir requisitos habilitantes no proporcionales o contrarios a los Pliegos Tipo.  
3. **Observaciones al Informe de Evaluación:**  Impugnación de evaluaciones erróneas y solicitudes de rechazo a competidores que hayan incurrido en causales insubsanables.

Con la propuesta jurídicamente blindada, el proceso pasa al Módulo 6 para la gestión operativa en equipo.

##### 7\. MÓDULO 6: PIPELINE DE LICITACIÓN Y GESTIÓN COMERCIAL EN EQUIPO

###### *Contexto e Importancia Estratégica*

La preparación de propuestas en licitaciones complejas requiere la colaboración coordinada de equipos interdisciplinarios (jurídico, financiero, técnico). El módulo administra la asignación de tareas, el control de versiones y el cumplimiento de los plazos del cronograma oficial de SECOP II.

###### *Tablero Kanban Multifase*

El ciclo de vida de la propuesta se visualiza en un tablero Kanban transaccional de seis fases:  
\[Identificado\] ➔ \[Evaluado (Go/No-Go)\] ➔ \[En Preparación\] ➔ \[Presentado\] ➔ \[En Traslado / Subsanación\] ➔ \[Adjudicado / Desierto\]

* **Identificado:**  Proceso capturado desde los PAA o búsquedas automatizadas en SECOP II.  
* **Evaluado (Go/No-Go):**  Decisión estratégica de participación tras la auditoría automática de brechas habilitantes.  
* **En Preparación:**  Asignación de tareas para la carga de anexos, elaboración de APUs e indicadores contables.  
* **Presentado:**  Confirmación de cargue de la oferta en la plataforma SECOP II.  
* **En Traslado / Subsanación:**  Seguimiento del informe de evaluación y respuesta a requerimientos dentro del plazo legal.  
* **Adjudicado / Desierto:**  Cierre del proceso y registro del resultado para inteligencia competitiva.

###### *Módulo Colaborativo Interdisciplinario y Especificación Técnica*

La plataforma administra el control de acceso basado en roles (RBAC) y garantiza la integridad de la información mediante sincronización en tiempo real vía  **WebSockets** :

* **Perfil Jurídico:**  Carga de escrituras, validación del RUP y generación de escritos de observación.  
* **Perfil Financiero:**  Modelación de estados financieros, consolidación de estructuras plurales y verificación de liquidez.  
* **Perfil Técnico:**  Construcción de Análisis de Precios Unitarios (APU), acreditación de experiencia de personal clave y matrices de especificaciones técnicas.  
* **Control de Concurrencia y Archivos:**  Para evitar sobrescrituras en documentos críticos de la propuesta, la arquitectura implementa  **bloqueo de objetos y versionamiento en AWS S3**  ( *Object Locking* ), asegurando la trazabilidad de cada cambio.

###### *Historial de Inteligencia Competitiva*

El módulo almacena información estratégica sobre competidores y entidades contratantes:

* Registro de competidores recurrentes en cada sector y región.  
* Análisis del porcentaje de descuento económico utilizado por los ganadores en procesos previos.  
* Histórico del comportamiento de pago e itinerario de evaluación de las entidades estatales.

Este flujo de trabajo se complementa con los módulos analíticos avanzados descritos en la Sección 8\.

##### 8\. PROPUESTA DE INFORMES Y MÓDULOS COMPLEMENTARIOS RECOMENDADOS

###### *Contexto e Importancia Estratégica*

Para maximizar el valor del software en el ecosistema GovTech/LegalTech, se recomienda la integración de dos módulos complementarios diseñados para resolver incertidumbres procedimentales en la evaluación económica y en la ejecución post-adjudicación.

###### *Módulo Complementario 1: Engine de Ponderación Económica Aleatoria y Análisis Precientífico en Pliegos Tipo*

En los Pliegos Tipo de infraestructura de transporte, la asignación de puntaje para la oferta económica no utiliza un cálculo lineal estático, sino un método asignado aleatoriamente al momento del cierre. De acuerdo con el  **Concepto C-382 de 2020 de la ANCP-CCE** , la elección del método (Media Aritmética, Media Aritmética Modificada, Mediana, Media Geométrica o Presupuesto Cerca) depende de variables impredecibles como el último dígito de la Tasa Representativa del Mercado (TRM) publicada el día del cierre.  
Para gestionar esta aleatoriedad, se propone un  **Simulador Montecarlo de Ponderación Económica** . El algoritmo ejecuta  \$10.000\$  iteraciones estocásticas simulando distribuciones de ofertas de competidores frente a las curvas de probabilidad de la TRM. El simulador identifica la propuesta económica óptima ( \$P\_{\\text{opt}}\$ ) que maximiza la esperanza matemática de puntaje acumulado en todos los métodos posibles de evaluación.  
\===================================================================================  
SIMULACIÓN MONTECARLO DE PONDERACIÓN ECONÓMICA (PLIEGOS TIPO \- CONCEPTO C-382/2020)  
\===================================================================================

\[Parámetros de Entrada\]  
  ├── Presupuesto Oficial (PO)  
  ├── Distribución Histórica de Ofertas de Competidores  
  └── Función de Probabilidad de TRM (Último Dígito en Fecha de Cierre)

               │  
               ▼  
   \[Ejecución de 10.000 Iteraciones Stochastic\]  
   ┌──────────────────────────────────────────────┐  
   │ Métodos Evaluados por Iteración:             │  
   │ 1\. Media Aritmética                          │  
   │ 2\. Media Aritmética Modificada               │  
   │ 3\. Mediana                                   │  
   │ 4\. Media Geométrica                          │  
   │ 5\. Presupuesto Cerca                         │  
   └──────────────────────────────────────────────┘  
               │  
               ▼  
\[Cálculo de Esperanza Matemática de Puntaje E(Puntaje)\]  
               │  
               ▼  
\[Resultado: Oferta Económica Óptima (P\_opt) que Maximiza Puntaje en Todos los Escenarios\]  
\===================================================================================

###### *Módulo Complementario 2: Control de Ejecución Contractual, Cumplimiento y Garantías Post-Adjudicación*

El ciclo de la contratación pública continúa tras la resolución de adjudicación. La administración del contrato exige el seguimiento de pólizas, actas de avance y facturación.  
Se propone un  **Tablero Post-Adjudicación**  para el seguimiento de la ejecución contractual:

* Control de expedición, aprobación y vigencia de pólizas (cumplimiento, buen manejo del anticipo, pago de salarios, calidad y estabilidad de la obra).  
* Monitoreo de actas de inicio, actas de suspensión, reanudación, adicionales de presupuesto y prorrogas en tiempo.  
* Trazabilidad de facturación electrónica y pagos recibidos de la entidad estatal.

###### *Resumen de la Propuesta Extensible*

Nombre del Módulo Recomendado,Desafío Normativo/Técnico que Resuelve,Valor Agregado Estratégico para el Usuario  
Engine de Ponderación Económica Aleatoria (Simulador Montecarlo),Impredecibilidad del método de asignación de puntaje económico en Pliegos Tipo derivado de fluctuaciones aleatorias en la TRM ( Concepto C-382 de 2020 ).,Determinación estadística del valor de la oferta económica que maximiza la probabilidad de obtener el mayor puntaje en cualquier escenario de evaluación.  
Control de Ejecución Contractual y Garantías Post-Adjudicación,"Riesgo de caducidad de pólizas de garantía, retrasos en la firma de actas de avance y descontrol de facturación en la fase de ejecución.","Tablero unificado de gestión post-adjudicación para el control de pólizas, actas de obra, facturación y trazabilidad de pagos estatales."

### Conclusión

La arquitectura técnica y funcional especificada para la plataforma de gestión de licitaciones públicas integra la normativa colombiana (Ley 80 de 1993, Ley 1150 de 2007, Ley 1882 de 2018, Ley 2022 de 2020 y Decreto 003 de 2025\) con capacidades avanzadas de automatización, analítica de datos e Inteligencia Artificial. La observancia de los lineamientos de la ANCP-CCE —en materia de evaluación financiera sobre el Último Año Fiscal del RUP, firmeza registral, reglas de subsanabilidad, exclusiones sectoriales de experiencia e inalterabilidad de propuestas— transforma este software en un ecosistema de alta precisión tecnológica, garantizando la seguridad jurídica, la eficiencia operativa y el éxito comercial en el sistema de contratación estatal de Colombia.  
