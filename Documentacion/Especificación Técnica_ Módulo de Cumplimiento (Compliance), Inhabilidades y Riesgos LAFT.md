### ESPECIFICACIÓN TÉCNICA Y FUNCIONAL DEL MÓDULO DE CUMPLIMIENTO (COMPLIANCE), INHABILIDADES Y GESTIÓN DE RIESGOS LAFT PARA PLATAFORMAS EN SECOP II

##### 1\. MARCO LEGAL, RÉGIMEN DE INHABILIDADES Y MATRIZ DE RIESGO OPERATIVO EN CONTRATACIÓN ESTATAL

El régimen de contratación pública en Colombia exige la implementación de controles tecnológicos rigurosos para garantizar que los procesos de selección se adelanten bajo los principios constitucionales de transparencia, selección objetiva, eficiencia y neutralidad. En el ecosistema del Sistema Electrónico para la Contratación Pública (SECOP II), la automatización de las verificaciones legales de cumplimiento ( *compliance* ) constituye una necesidad operativa crítica para eliminar la discrecionalidad de los Comités Evaluadores y prevenir la adjudicación de contratos a oferentes inhabilitados. La urgencia de esta automatización se sustenta en hallazgos empíricos: según el  *Observatorio de Contratación de la Cámara Colombiana de Infraestructura (OCCI 2025\)* , de un universo de 127 entidades estatales analizadas entre 2019 y 2024,  **el 30% introdujo modificaciones parciales o no autorizadas**  a los Pliegos Tipo y  **un 20% omitió por completo su implementación** , registrándose una aplicación íntegra en apenas la mitad de los casos. Un módulo parametrizado de cumplimiento no solo valida la capacidad legal de los proponentes, sino que ejecuta de forma previa un chequeo automatizado de integridad estructural sobre los pliegos de condiciones para detectar alteraciones ilegales a las condiciones estandarizadas, salvaguardando la certeza jurídica de la selección.

###### *1.1. Fundamento Normativo del Régimen de Inhabilidades, Incompatibilidades y Transparencia*

El Módulo de Compliance integra un motor de reglas de negocio que codifica jerárquicamente las prohibiciones e impedimentos legales del ordenamiento colombiano. El núcleo del régimen sancionatorio y preventivo se consolida en el Artículo 8 de la Ley 80 de 1993, el cual establece las causales generales de inhabilidad e incompatibilidad para participar en licitaciones y celebrar contratos con el Estado. Este marco fundamental ha sido adicionado y profundizado por estatutos especializados: la Ley 1474 de 2011 (Estatuto Anticorrupción), la Ley 2014 de 2019 (sanciones penales por actos de corrupción y deudores alimentarios), la Ley 2022 de 2020 (que modificó el artículo 4 de la Ley 1882 de 2018 para hacer obligatoria la estandarización documental en múltiples sectores) y la Ley 2195 de 2022 (Ley de Transparencia, Prevención y Lucha contra la Corrupción), que introdujo esquemas de responsabilidad administrativa sobre personas jurídicas y la identificación vinculante de beneficiarios finales.  
El uso obligatorio de los "documentos tipo" (pliegos estandarizados) instaurado por la Ley 1882 de 2018 para infraestructura de transporte y extendido por la Ley 2022 de 2020 a infraestructura social (educación, salud, cultura, deporte), agua potable, saneamiento básico y catastro multipropósito, restringe la potestad autonómica de las entidades territoriales en la fijación de requisitos habilitantes. El sistema de software debe auditar el cumplimiento estricto de las resoluciones de la Agencia Nacional de Contratación Pública \- Colombia Compra Eficiente (ANCP-CCE) —tales como la Res. 1798/2019, 044-045/2020, 219-220/2021, 275/2022 y 015/2023—. Adicionalmente, en la ponderación económica de pliegos tipo de transporte, el sistema debe calcular dinámicamente las fórmulas aleatorias asociadas a la Tasa Representativa del Mercado (TRM) conforme al Concepto C-382/2020 de la ANCP-CCE.  
Ley / Norma,Objetivo Regulatorio Central,Requisito Formal y Regla de Verificación Automatizada en Software  
Ley 80 de 1993  (Art. 8),Definición del régimen general de inhabilidades e incompatibilidades para contratar con el Estado.,"Validación cruzada del documento de identidad/NIT contra registros de sanciones activas, interdicción de derechos contractuales y parentescos prohibidos."  
Ley 1474 de 2011  (Estatuto Anticorrupción),"Prevención y sanción de actos de corrupción, colusión en licitaciones e incompatibilidades de exservidores públicos.","Identificación de vínculos contractuales previos, sanciones disciplinarias/fiscales y periodos de restricción (""pérdida de huella"") de exservidores."  
Ley 1882 de 2018  (Art. 4 y 5),Obligatoriedad de Pliegos Tipo y delimitación estricta del régimen de subsanabilidad de ofertas.,Validación de inalterabilidad del pliego; bloqueo de adición de documentos de puntaje; verificación de firmeza de RUP y garantía de seriedad al cierre.  
Ley 2014 de 2019,Inhabilidades por condenas penales por delitos contra la administración pública y sanción a deudores morosos.,Búsqueda cruzada de antecedentes penales por delitos de corrupción y consulta en el Registro de Deudores Alimentarios Morosos (REDAM).  
Ley 2022 de 2020,Mandato general y vinculante a ANCP-CCE para expedir Documentos Tipo en diversos sectores contractuales.,Chequeo automatizado de integridad estructural sobre el pliego publicado para detectar modificaciones no autorizadas por la entidad territorial.  
Ley 2195 de 2022,"Transparencia, prevención de la corrupción y responsabilidad administrativa de personas jurídicas.",Inspección de la cadena de propiedad corporativa hasta el Nivel 4 para la identificación del Registro Único de Beneficiarios Finales (RUB).

###### *1.2. Matriz de Riesgo por Conflictos de Interés, Parentesco y Vínculos Contractuales*

Para evitar el direccionamiento de los procesos contractuales o la afectación del principio de libre concurrencia, el módulo evalúa en tiempo real las relaciones entre los oferentes y la entidad contratante. El análisis abarca desde la comprobación de parentescos con servidores públicos de nivel directivo, asesor o ejecutivo, hasta la detección de vínculos contractuales simultáneos o prácticas colusorias entre competidores.  
Factor de Riesgo,Detonante Legal ( Trigger ),Regla de Detección / Dato Requerido en SECOP II,Impacto en la Evaluación de la Oferta  
Parentesco con Servidores Públicos,Ley 80/1993 Art. 8 Lit. b; Ley 1474/2011.,"Vínculo de consanguinidad (hasta 4º grado), afinidad (2º grado) o civil con el ordenador del gasto o miembros del Comité Evaluador.",Inhabilidad Insubsanable:  Rechazo directo e inmediato de la propuesta en la fase de habilitación jurídica.  
Incompatibilidad por Exservidor Público,Ley 1474/2011 Art. 4.,Exfuncionarios que hayan prestado servicios en la entidad en los últimos dos (2) años y hayan intervenido en la gestión del objeto.,Inhabilidad Sobreviniente / Previa:  Exclusión del proponente o del integrante del consorcio involucrado.  
Vínculos Contractuales Simultáneos / Acumulación,Ley 80/1993; Pliegos Tipo ANCP-CCE.,Cruce de NIT/Cédula en contratos en ejecución simultánea en la misma entidad territorial que superen la capacidad de contratación.,Inhabilitación para Adjudicación:  Impedimento legal para resultar adjudicatario en procesos incompatibles.  
Colusión e Interposición de Sociedades,Ley 1474/2011 Art. 27; Ley 2195/2022.,"Coincidencia de Representantes Legales, Socios Comunes, Revisores Fiscales, direcciones IP de envío de oferta o metadatos en SECOP II.",Rechazo por Mala Fe / Alertamiento:  Reporte inmediato a la Superintendencia de Industria y Comercio y exclusión del proceso.  
La solidez de este marco legal y la categorización parametrizada de los riesgos operativos constituyen la base funcional para desplegar una arquitectura de integración en tiempo real con las bases de datos de los organismos de control y los registros públicos del Estado.

##### 2\. ARQUITECTURA DE INTEGRACIÓN Y VERIFICACIÓN AUTOMATIZADA EN TIEMPO REAL CON FUENTES OFICIALES Y LISTAS RESTRICTIVAS

La verificación manual de requisitos habilitantes e idoneidad jurídica introduce altos niveles de riesgo operacional, propiciando dilaciones en las etapas evaluativas e inobservancias inadvertidas de inhabilidades vigentes. La arquitectura del Módulo de Compliance establece una capa de integración automatizada basada en servicios web interoperables (REST/SOAP) que consultan de manera asíncrona los registros públicos oficiales de las autoridades colombianas y listas restrictivas internacionales. Esta validación continua elimina el margen de error humano, garantiza la inalterabilidad de los datos recolectados y asegura una trazabilidad auditable en cada fase del procedimiento de selección.

###### *2.1. Integración con Fuentes Oficiales Nacionales y Verificación de Registro (RUP, Contraloría, Procuraduría, Policía)*

En cumplimiento del Artículo 15 del Decreto Ley 019 de 2012 (Decreto Antitrámites) y los estándares de interoperabilidad técnica fijados en el Decreto 003 de 2025 para plataformas electrónicas del Sistema de Compra Pública, las entidades estatales deben conectarse directamente a las bases públicas en línea sin solicitar certificados que ya reposen en entidades del Estado.  
A continuación se especifican las reglas operativas, parámetros de validación y protocolos de falla de las integraciones del módulo:

* **1\. Registro Único de Proponentes (RUP) \- RUES / Cámaras de Comercio:**  
* **Disparador de Consulta (**  ***Trigger***  **):**  Evento de cierre del proceso de selección y recepción formal de la oferta en SECOP II.  
* **Lógica de API y Resiliencia:**  Petición HTTP GET/POST asíncrona al  *endpoint*  del RUES utilizando el NIT o cédula del proponente. Límite de tiempo ( *timeout* ) configurado en 15 segundos con un máximo de tres (3) reintentos mediante algoritmo de retardo exponencial. En caso de caída de la API del RUES durante la ventana de cierre, el módulo activa un mecanismo de captura de respaldo ( *caching/fallback* ) que consulta el último estado en firme registrado en la memoria intermedia de SECOP II y emite una alerta de verificación en cola prioritaria.  
* **Verificación de Firmeza y Renovación Oportuna (Ley 1150/2007 Art. 6.1, Decreto 1082/2015 Art. 2.2.1.1.1.5.1):**  El RUP constituye plena prueba de la capacidad jurídica, financiera, organizacional y de experiencia. El registro debe estar  **vigente y en firme**  al momento del cierre del proceso de selección (Concepto C-933 de 2026). Si el proponente radicó la solicitud de renovación ante la Cámara de Comercio a más tardar el  **quinto día hábil del mes de abril de cada año**  (Conceptos C-525/2026, C-423/2021), el RUP conserva plenamente sus efectos legales; el sistema evaluará transitoriamente la propuesta con la información en firme previa, sin que proceda el rechazo de la oferta. Si la renovación no fue radicada en dicho plazo, los efectos del RUP cesan automáticamente, exigiendo el trámite de una "nueva inscripción", la cual deberá adquirir firmeza plena antes del cierre del proceso para habilitar al oferente.  
* **Evaluación de Actualizaciones:**  Si existe una solicitud de actualización en trámite que no ha adquirido firmeza al momento del cierre, el sistema prescinde de la nueva información y evalúa la oferta utilizando exclusivamente los datos en firme a la fecha de cierre, sin rechazar la propuesta (Concepto C-933 de 2026).  
* **Corte Financiero:**  De acuerdo con el Decreto 1082 de 2015 y la doctrina de la ANCP-CCE (Concepto C-933 de 2026), la capacidad financiera y organizacional se valida de manera obligatoria sobre los indicadores del  **último año fiscal**  registrado en el RUP, habiendo cesado la aplicabilidad del régimen transitorio del "mejor año fiscal". Para sociedades de reciente constitución sin antigüedad para poseer estados financieros auditados al 31 de diciembre, el sistema valida que los indicadores financieros correspondan a los estados financieros de apertura o trimestrales reportados formalmente en el RUP (Concepto C-837 de 2022).  
* **2\. Boletín de Responsables Fiscales \- Contraloría General de la República (CGR):**  
* **Disparador de Consulta (**  ***Trigger***  **):**  Publicación de la lista de oferentes y corrida periódica previa a la adjudicación.  
* **Lógica de API y Resiliencia:**  Consulta REST al Sistema de Inhabilitados por Sanciones Fiscales.  *Timeout*  de 10 segundos. Si el servicio de la CGR no responde, el sistema realiza  *polling*  cada 30 minutos sin detener el flujo de evaluación, bloqueando únicamente la emisión del acta final de adjudicación.  
* **Parámetros de Validación:**  Ausencia de registro del NIT/Cédula en el boletín vigente. La coincidencia positiva activa la inhabilidad prevista en la Ley 610 de 2000 y la Ley 734 de 2002, determinando la no habilitación jurídica del oferente.  
* **3\. Certificado de Antecedentes Disciplinarios \- Procuraduría General de la Nación (PGN):**  
* **Disparador de Consulta (**  ***Trigger***  **):**  Etapa de habilitación jurídica y traslado del informe de evaluación.  
* **Lógica de API y Resiliencia:**  Consulta SOAP/REST al Sistema de Información de Registro de Sanciones e Incapacidades (SIRI).  *Timeout*  de 12 segundos con almacenamiento en caché por 24 horas para consultas idénticas dentro de la misma fase evaluativa.  
* **Parámetros de Validación:**  Comprobación de inexistencia de sanciones disciplinarias vigentes (generales o especiales para contratar) vinculadas a la persona natural, persona jurídica o sus representantes legales.  
* **4\. Antecedentes Judiciales y Policiales \- Policía Nacional (PONAL):**  
* **Disparador de Consulta (**  ***Trigger***  **):**  Evaluación inicial de capacidad legal y verificación previa a adjudicación.  
* **Lógica de API y Resiliencia:**  Consulta cifrada vía HTTPS al servicio del Sistema de Antecedentes de la Policía Nacional. Manejo de fallas mediante reintentos automáticos en ventana asíncrona.  
* **Parámetros de Validación:**  Confirmación de no existencia de condenas penales ejecutoriadas por delitos sancionados por la Ley 2014 de 2019 e inhabilitaciones del Código Penal para contratar con el Estado.  
* **5\. Sistema de Sanciones, Multas e Inhabilitaciones (SECOP II y RUP):**  
* **Disparador de Consulta (**  ***Trigger***  **):**  Apertura de ofertas y actualización del informe de evaluación.  
* **Lógica de API y Resiliencia:**  Búsqueda directa en el repositorio central de datos de la ANCP-CCE y anotaciones del RUP.  
* **Parámetros de Validación:**  Identificación de multas no pagadas, declaratorias de incumplimiento o caducidad contractual incoadas dentro de los cinco (5) años anteriores a la fecha de cierre.

###### *2.2. Monitoreo en Listas Internacionales LAFT/PADM y Control de Personas Expuestas Políticamente (PEP)*

El control de riesgos de Lavado de Activos, Financiación del Terrorismo y Proliferación de Armas de Destrucción Masiva (LAFT/PADM) exige un tamizaje ( *screening* ) continuado de los oferentes, sus beneficiarios finales y administradores frente a listas internacionales y bases de datos de Personas Expuestas Políticamente (PEP).  
Fuente de Screening,Frecuencia de Actualización,Lógica de Coincidencia ( Matching Logic ),Acción del Sistema / Nivel de Alerta  
Listas OFAC (Sancionados Clinton) y Consejo de Seguridad de la ONU,Diaria (Sincronización automatizada a las 00:00 UTC),Exacta por Identificación y Algoritmo Difuso ( Fuzzy Search  \- Jaro-Winkler \>= 85%),"Alerta Roja Crítica:  Bloqueo preventivo de la oferta, reporte inmediato al Oficial de Compliance y notificación a la UIAF."  
Listas de Sancionados del Banco Mundial y Banco Interamericano de Desarrollo (BID),Semanal (Sincronización programada),Distancia de Levenshtein \> 80% sobre nombres y razón social,Alerta Naranja Alta:  Suspensión de la habilitación técnica; requerimiento de aclaración legal al proponente.  
Base de Datos de Personas Expuestas Políticamente (PEP) \- DAFP / SISCEN,Diaria (Integración con Departamento Administrativo de la Función Pública),Búsqueda Exacta por Cédula \+ Algoritmo sobre Estructura Jerárquica de Parentesco,Alerta Amarilla Media:  Notificación al Comité Evaluador para la ejecución del protocolo de Debida Diligencia Intensificada.  
El escrutinio automatizado sobre personas individuales y estructuras corporativas singulares se propaga operativamente cuando las propuestas son radicadas por esquemas asociativos o proponentes plurales.

##### 3\. AUDITORÍA DE COMPLIANCE EN PROPONENTES PLURALES (CONSORCIOS Y UNIONES TEMPORALES) Y GESTIÓN DE INHABILIDADES SOBREVINIENTES

La auditoría de cumplimiento en estructuras plurales (Consorcios y Uniones Temporales) demanda una arquitectura evaluativa multinivel debido a la coexistencia de diversos sujetos de derecho bajo una única postura contractual. El Módulo de Compliance ejecuta una inspección en cascada que penetra la totalidad de la cadena corporativa para evitar la ocultación de conflictos de interés, la elusión de sanciones o la transferencia indebida de inhabilidades.

###### *3.1. Evaluación en Cascada e Inspección Trazable en Estructuras Plurales*

El motor de cumplimiento no restringe su análisis al documento de constitución del consorcio o unión temporal. La plataforma despliega un flujo de auditoría jerárquico ( *step-by-step audit workflow* ) organizado en cuatro niveles de profundidad:

* **Nivel 1: Inspección de la Estructura Plural Consolidada**  
* Captura el documento de acuerdo consorcial o promesa de sociedad futura.  
* Valida que la suma de las participaciones porcentuales de los integrantes sea exactamente igual al 100%.  
* Asigna un identificador único de trazabilidad ( *Hash UUID* ) a la oferta plural en SECOP II.  
* **Nivel 2: Inspección Individual de Integrantes (Personas Naturales o Jurídicas)**  
* Desagrega a cada miembro conformante del consorcio o unión temporal.  
* Consulta individualmente las bases oficiales (RUES/RUP, CGR, SIRI/PGN, PONAL) y listas LAFT/PADM.  
* Verifica la firmeza del RUP de cada integrante y valida que la capacidad financiera agregada responda a las reglas del pliego tipo sobre los indicadores del último año fiscal.  
* **Nivel 3: Inspección de Órganos de Gobierno, Dirección y Administración**  
* Extrae la identidad de los Representantes Legales (principales y suplentes) y Miembros de Junta Directiva de cada persona jurídica integrante.  
* Somete a cada directivo y administrador al tamizaje de listas de inhabilidades, antecedentes penales, disciplinas y listas PEP.  
* **Nivel 4: Inspección de Control Financiero y Beneficiarios Finales (Ley 2195 de 2022\)**  
* Identifica a los Contadores Públicos y Revisores Fiscales que firman los estados financieros aportados, verificando la vigencia de sus tarjetas profesionales ante la Junta Central de Contadores.  
* Atraviesa la estructura accionaria para identificar a los  **Beneficiarios Finales**  (personas naturales con más del 5% de capital o control, según la Ley 2195 de 2022 y el Registro Único de Beneficiarios Finales \- RUB).  
* Ejecuta la validación final sobre dichos beneficiarios para descartar interposición de sociedades, colusión o presencia en listas restrictivas.

###### *3.2. Gestión de Inhabilidades Sobrevinientes y Mecanismos de Remediación, Sustitución o Cesión*

Si durante el trámite del proceso de selección o durante la ejecución del contrato sobreviene una causal de inhabilidad o incompatibilidad en uno de los integrantes de la estructura plural, el sistema aplica los mecanismos de remediación establecidos por la legislación colombiana (Art. 9, Ley 80 de 1993), preservando la inalterabilidad de la propuesta y la legalidad del procedimiento.

###### *Escenario A: Inhabilidad Sobreviniente Durante el Procedimiento de Selección*

**Barrera Legal:**  Prohibición material de que el proponente inhabilitado continúe participando, acompañada de la regla estricta de inalterabilidad de los términos técnicos y económicos de la oferta presentada al cierre.  
**Flujo de Remediación Automatizado:**

* **Detección y Notificación:**  El módulo detecta la inhabilidad sobreviniente mediante monitoreo periódico y notifica inmediatamente al representante del proponente plural y al Comité Evaluador.  
* **Ventana de Cesión Interna / Sustitución:**  El sistema habilita una ventana procedimental para que los demás miembros presenten la cesión de la participación del integrante inhabilitado a favor de un tercero no inhabilitado, o la redistribución porcentual entre los integrantes restantes.  
* **Auditoría de Equivalencia Habilitante:**  El módulo ejecuta una verificación automatizada para confirmar que la sustitución o reorganización mantenga o supere los requisitos habilitantes (experiencia, capacidad financiera y organizacional) acreditados al cierre, sin modificar el valor de la propuesta ni alterar la asignación de puntaje.

###### *Escenario B: Inhabilidad Sobreviniente Durante la Ejecución Contractual*

**Barrera Legal:**  Mandato del Artículo 9 de la Ley 80 de 1993 que obliga a renunciar a la ejecución contractual o ceder la participación en el contrato cuando sobrevenga una inhabilidad en el contratista.  
**Flujo de Remediación Automatizado:**

* **Identificación y Bloqueo Operativo:**  El sistema alerta al Ordenador del Gasto y al Supervisor del contrato en SECOP II, bloqueando preventivamente la aprobación de actas de cobro o autorizaciones de pago.  
* **Gestión de Cesión Contractual:**  Habilitación del módulo de modificación contractual para registrar la propuesta de cesión de la participación inhabilitada a un tercero calificado.  
* **Aprobación y Trazabilidad:**  Validación de requisitos del cesionario por el módulo y registro de la autorización firmada por la entidad estatal. El sistema genera un registro de auditoría ( *log* ) inmutable con sello de tiempo digital, conservando la minuta contractual previa y publicando el otrosí correspondiente.

La auditoría exhaustiva de los proponentes plurales y la automatización de las contingencias legales sustentan la generación de reportes de debida diligencia y la emisión de alertas operativas en tiempo real.

##### 4\. MATRIZ DE DEBIDA DILIGENCIA, ALERTAS PREVENTIVAS Y REPORTES DE AUDITORÍA

La efectividad del Módulo de Compliance radica en su capacidad para transformar chequeos de datos heterogéneos en evidencia jurídica estructurada y decisiones operativas automatizadas. Para ello, el sistema clasifica las inconsistencias distinguiendo estrictamente entre defectos subsanables y causales de rechazo insubsanable, y emite un estándar documental denominado  *Certificado de Debida Diligencia / Compliance* , respaldado por registros de auditoría inmutables.

###### *4.1. Sistema de Alertas Preventivas en Tiempo Real y Reglas de Subsanabilidad vs. Rechazo Insubsanable*

El régimen de subsanabilidad estipulado en el Artículo 5 de la Ley 1150 de 2007 (modificado por el Artículo 5 de la Ley 1882 de 2018\) establece que las entidades estatales deben solicitar la corrección de los requisitos de la propuesta que  **no afecten la asignación de puntaje** . La doctrina unificada de la ANCP-CCE (Conceptos C-057/2026, C-1376/2025, C-518/2025 y C-431/2026) fija las fronteras legales de la subsanación bajo las siguientes reglas precisas:

1. **Distinción sustancial entre el Hecho y la Prueba (Concepto C-1376/2025):**  La prohibición de acreditar circunstancias ocurridas con posterioridad al cierre del proceso aplica estrictamente al  **hecho material habilitante**  ( *el hecho* ), no a la fecha del documento que lo certifica ( *la prueba* ). Una certificación expedida con fecha posterior al cierre es plenamente válida para subsanar, siempre que acredite una capacidad, contrato o condición que ya existía materialmente antes del cierre.  
2. **Reasignación de Experiencia (Concepto C-431/2026):**  Un proponente puede solicitar en la etapa de subsanación que un contrato inicialmente aportado para la asignación de puntaje sea evaluado como experiencia mínima habilitante,  **siempre y cuando**  dicho contrato reposara íntegramente en la oferta presentada al cierre, no introduzca hechos nuevos y no altere la posición de puntaje o el orden de elegibilidad frente a los demás competidores.  
3. **Causales de Insubsanabilidad y Rechazo Directo:**  No es permitido subsanar: i) la omitida entrega inicial de la Garantía de Seriedad de la Oferta junto con la propuesta (Ley 1882/2018, Art. 5 Par. 3); ii) la acreditación de capacidades o hechos ocurridos con posterioridad al cierre; y iii) la modificación de ofertas con el propósito de alterar la asignación de puntaje.

Evento de Cumplimiento / Falencia Detectada,Clasificación Legal (Subsanable vs. Rechazo Insubsanable),Nivel de Alerta del Sistema,Ventana Procedimental de Respuesta  
Omisión del Certificado de Existencia o RUP vigente,Subsanable:  Documento sobre capacidad legal/habilitante que no otorga puntaje.,Alerta Amarilla,Hasta el vencimiento del término de traslado del informe de evaluación.  
"Certificación documental expedida POSTERIOR al cierre, referida a un hecho PREVIO (Concepto C-1376/2025)","Subsanable:  La prueba es posterior, pero el hecho acreditado existía antes del cierre.",Alerta Amarilla,Término de traslado del informe de evaluación.  
Solicitud de reasignar contrato de Puntaje a Experiencia Habilitante (Concepto C-431/2026),"Subsanable:  Ajuste sobre documentos presentes en la oferta desde el cierre, sin alterar el ranking.",Alerta Amarilla,Término de traslado del informe de evaluación.  
Omisión Total de la Garantía de Seriedad de la Oferta,"Rechazo Insubsanable:  Expresa prohibición legal (Ley 1882 de 2018, Art. 5 Par. 3).",Alerta Roja Crítica,Sin ventana. Causal de rechazo directo en la evaluación inicial.  
Acreditación de Experiencia o Indicadores Ejecutados POSTERIOR al Cierre,Rechazo Insubsanable:  Prohibición sustancial de acreditar hechos extemporáneos.,Alerta Roja Crítica,Sin ventana. Invalidez de la documentación aportada.  
Inclusión en el Boletín de Responsables Fiscales (CGR) o Registro REDAM,Rechazo Insubsanable:  Inhabilidad legal directa para contratar con el Estado.,Alerta Roja Crítica,Requerimiento de retiro o rechazo directo de la propuesta.  
No presentación de documentos subsanables dentro del plazo legal,Rechazo Insubsanable:  Incumplimiento del requerimiento formal de la entidad.,Alerta Roja Operativa,Aplica al vencimiento del plazo de traslado del informe evaluador.

###### *4.2. Generación Automatizada del 'Certificado de Debida Diligencia / Compliance' y Reportes de Auditoría*

Concluidas las consultas y verificaciones algorítmicas, el sistema emite un reporte estandarizado codificado en formato JSON y firmado digitalmente mediante certificado PKI (Infraestructura de Clave Pública), el cual se adjunta como evidencia inalterable al expediente electrónico en SECOP II.  
{  
  "certificado\_compliance": {  
    "encabezado": {  
      "id\_certificado": "COMP-2026-SECOP2-008941",  
      "timestamp\_emision": "2026-03-30T10:15:30Z",  
      "entidad\_contratante": "INVIAS \- Instituto Nacional de Vias",  
      "id\_proceso": "LIC-PUB-012-2026",  
      "hash\_integridad\_oferta\_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"  
    },  
    "sujeto\_evaluado": {  
      "tipo\_proponente": "Consorcio",  
      "nombre\_proponente": "Consorcio Infraestructura Vial 2026",  
      "integrantes": \[  
        {  
          "nombre": "Constructora Nacional S.A.S.",  
          "nit": "900123456-1",  
          "porcentaje\_participacion": 60.0  
        },  
        {  
          "nombre": "Ingenieria Territorial Ltda.",  
          "nit": "800987654-3",  
          "porcentaje\_participacion": 40.0  
        }  
      \]  
    },  
    "verificaciones\_fuentes\_oficiales": {  
      "rup\_cuerpos\_comerciales": {  
        "estado": "VALIDO\_Y\_EN\_FIRME",  
        "fecha\_renovacion\_radicada": "2026-04-03",  
        "evaluacion\_corte\_financiero": "ANO\_FISCAL\_2025\_VIGENTE"  
      },  
      "antecedentes\_fiscales\_contraloria": "SIN\_ANTECEDENTES",  
      "antecedentes\_disciplinarios\_procuraduria": "SIN\_ANTECEDENTES",  
      "antecedentes\_judiciales\_policia": "SIN\_ANTECEDENTES",  
      "monitoreo\_listas\_laft\_pep": "LIMPIO\_SIN\_COINCIDENCIAS",  
      "registro\_deudores\_alimentarios\_REDAM": false  
    },  
    "beneficiarios\_finales\_ley\_2195": \[  
      {  
        "nombre\_completo": "Carlos Alberto Gomez Martinez",  
        "identificacion": "19.456.789",  
        "porcentaje\_participacion\_indirecta": 35.5,  
        "sanciones\_laft\_activas": false  
      },  
      {  
        "nombre\_completo": "Maria Fernanda Lopez Rios",  
        "identificacion": "52.876.543",  
        "porcentaje\_participacion\_indirecta": 24.5,  
        "sanciones\_laft\_activas": false  
      }  
    \],  
    "dictamen\_final\_compliance": {  
      "calificacion\_habilitante\_legal": "HABILITADO",  
      "alertas\_pendientes\_subsanacion": 0,  
      "firma\_digital\_sello\_tiempo": "3b9a1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c"  
    }  
  }  
}

###### *Resumen de Capacidades del Registro de Auditoría ( Audit Log )*

* **Inalterabilidad y Criptografía:**  Almacenamiento del expediente en base de datos protegida contra escritura ( *append-only* ) respaldada con firmas PKI y resúmenes criptográficos SHA-256 para evitar manipulaciones a posteriori.  
* **Trazabilidad Temporal Meticulosa:**  Marcación de fecha, hora, minuto y segundo ( *timestamping*  sincronizado con la hora legal colombiana) para cada consulta enviada y recibida desde las API estatales.  
* **Trazabilidad de Roles:**  Identificación unívoca del funcionario, evaluador o sistema automatizado que requirió subsanaciones, aprobó habilitaciones o consignó dictámenes jurídicos.  
* **Exportabilidad Multiformato:**  Descarga de evidencias en JSON/XML para interoperabilidad con sistemas de control fiscal, y generación de documentos oficializados en formato PDF/A firmados digitalmente.

La automatización completa de las verificaciones legales a través de un módulo especializado de compliance en SECOP II fortalece la transparencia administrativa, blinda los trámites contractuales contra la corrupción e incrementa la confianza ciudadana en la asignación de los recursos públicos en Colombia.  
