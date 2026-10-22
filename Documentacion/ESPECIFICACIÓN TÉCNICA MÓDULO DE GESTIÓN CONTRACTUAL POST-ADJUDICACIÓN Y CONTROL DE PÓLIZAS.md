### ESPECIFICACIÓN TÉCNICA: MÓDULO DE GESTIÓN CONTRACTUAL POST-ADJUDICACIÓN Y CONTROL DE PÓLIZAS

##### 1\. FASE POST-ADJUDICACIÓN Y PERFECCIONAMIENTO DEL CONTRATO ESTATAL

###### *1.1. Arquitectura de Requisitos Legales de Perfeccionamiento y Ejecución*

De conformidad con lo establecido en el artículo 41 de la Ley 80 de 1993 y el Decreto 1082 de 2015, el perfeccionamiento y la legalización de los contratos estatales exigen una secuencia rigurosa de verificaciones normativas e instrumentales. El motor de reglas de negocio del sistema ejecutará una validación síncrona de precondiciones de carácter bloqueante, impidiendo la transición del contrato hacia el estado "En Ejecución" hasta tanto no se complete satisfactoriamente la totalidad de los siguientes hitos secuenciales:

* **Verificación de Perfeccionamiento y Firma Digital (Art. 41 Ley 80 de 1993):**  Constatación de la existencia del acuerdo sobre el objeto y la contraprestación, manifestado mediante la suscripción del documento contractual a través de la infraestructura de firma digital o electrónica avanzada por parte del Ordenador del Gasto y el Representante Legal del contratista adjudicatario.  
* **Expedición y Vinculación del Registro Presupuestal (RP):**  Operación de imputación definitiva de la apropiación presupuestal emitida por la entidad para amparar el compromiso derivado del contrato perfeccionado, garantizando que el saldo quede efectivamente reservado en la vigencia fiscal correspondiente.  
* **Aprobación de la Garantía Única Contractual:**  Radicación del amparo expedido por la compañía aseguradora o entidad bancaria y posterior emisión del acto administrativo formal de aprobación de la póliza expedida por la entidad estatal dentro de la plataforma.  
* **Validación de Paz y Salvo de Aportes al Sistema de Seguridad Social Integral y Parafiscales:**  Verificación del cumplimiento en el pago de aportes a salud, pensión, ARL y cajas de compensación familiar del contratista, conforme a las normas vigentes.  
* **Suscripción Digital del Acta de Inicio:**  Generación e intercambio de firmas electrónicas autorizadas del hito de inicio de ejecución física y temporal, condicionado a la validez temporal del RP y a la aprobación previa de la póliza.

###### *1.2. Automatización del Registro Presupuestal (RP) y Aprobación de Garantías en SECOP II*

En concordancia con los lineamientos del Decreto 003 de 2025 sobre interoperabilidad de los sistemas electrónicos del sector público para la simplificación, trazabilidad y actualización continua de datos, la plataforma integrará sus flujos transaccionales mediante servicios web y protocolos de intercambio de información.  
Hito Operativo,Regla de Negocio / Verificación Automatizada,Sistemas Interoperables / Entidad de Soporte  
Adjudicación y Firma del Contrato,Validación síncrona de la firmeza del acto de adjudicación. Generación automatizada de la minuta estandarizada y orquestación del flujo multiparte de firmas electrónicas con estampa de tiempo.,SECOP II / Módulo de Firma Electrónica / PKI Certificada  
Expedición del Registro Presupuestal (RP),"Bloqueo preventivo del contrato hasta recibir la estructura XML del RP. Verificación del CDP origen, saldo disponible, rubro asignado y congruencia con el valor adjudicado.",Interfaz REST/SOAP con SIIF Nación / ERPs Financieros Territoriales  
Aprobación de Pólizas de Garantía,"Verificación algorítmica de coberturas, sumas aseguradas y vigencias legales frente a las matrices del pliego tipo. Emisión automatizada del acto de aprobación técnica de la póliza.",SECOP II / Centrales de Aseguradoras / Aseguradoras Privadas  
Habilitación de Ejecución y Pagos,"Cruce tridimensional síncrono: RP en estado ""Inscrito"", Póliza en estado ""Aprobado"" y Certificado PILA en estado ""Válido"", habilitando la firma del Acta de Inicio.",SECOP II / SIIF Nación / Operadores PILA (Seguridad Social)

###### *1.3. Control e Hito Digital de Suscripción del Acta de Inicio y Plazo de Ejecución*

El sistema administrará la iniciación formal de la fase de ejecución a través del siguiente procedimiento informatizado paso a paso:

* **Validación Síncrona de Precondiciones:**  El motor del sistema evalúa automáticamente que el contrato se encuentre perfeccionado (minuta firmada), que exista un RP en firme en SIIF/ERP territorial y que la Garantía Única cuente con aprobación administrativa formal.  
* **Estructuración y Precalculo del Cronograma:**  El módulo precalcula la fecha estimada de finalización contractual según las reglas fijadas en los pliegos (días calendario o días hábiles, excluyendo sábados, domingos y festivos nacionales).  
* **Flujo Secuencial de Firma Digital:**  
* *Paso 3.1:*  Firma electrónica de la Interventoría/Supervisión designada.  
* *Paso 3.2:*  Firma electrónica del Representante Legal del Contratista.  
* *Paso 3.3:*  Firma electrónica del Ordenador del Gasto de la Entidad Estatal.  
* **Estampa de Tiempo y Activación del Estado:**  Una vez registrada la última firma, el sistema estampa la fecha exacta de inicio, conmuta el estado contractual a "En Ejecución" e inicia los cronómetros de control del plazo de ejecución.

**Algoritmos de Cálculo y Reglas de Suspensión:**

* **Cálculo de Vencimiento:**   \$Fecha\\\_Fin \= Fecha\\\_Inicio \+ Plazo\\\_Contractual\$ . Si el plazo se estipula en días hábiles, el algoritmo omite fines de semana y festivos oficiales parametrizados en el calendario del sistema.  
* **Congelamiento Temporal por Suspensión:**  Al procesar un "Acta de Suspensión" debidamente firmada por las partes, el sistema detiene el cómputo del plazo de ejecución, congelando el reloj del contrato y fijando el estado del contrato como "Suspendido".  
* **Reactivación y Recálculo:**  Al suscribir el "Acta de Reinicio", el sistema reanuda el cómputo y recalcula automáticamente el vencimiento contractual mediante la fórmula:  \$Nueva\\\_Fecha\\\_Fin \= Fecha\\\_Fin\\\_Anterior \+ Días\\\_Efectivos\\\_Suspensión\$ .

##### 2\. MÓDULO DE MONITOREO Y CONTROL AUTOMATIZADO DE PÓLIZAS Y GARANTÍAS

###### *2.1. Matriz de Riesgos y Amparos Obligatorios por Tipología Contractual*

El motor de reglas de garantías exige, valida y monitorea en tiempo real la suficiencia y vigencia de las coberturas amparadas por las pólizas, según la tipología del objeto contractual:  
Tipología de Amparo,Riesgo Cubierto,Aplica a (Obra / Interventoría / Consultoría / Servicios),Mecanismo de Verificación del Sistema  
Buen Manejo del Anticipo,"Correcta inversión, uso indebido o apropiación de los dineros girados con carácter de anticipo para la ejecución.","Obra, Interventoría, Consultoría, Servicios",Valida que la cobertura equivalga al 100% de los dineros entregados como anticipo y que su vigencia se extienda hasta la liquidación del contrato o amortización total.  
Cumplimiento del Contrato,"Perjuicios derivados del incumplimiento total, parcial, tardío u defectuoso de las obligaciones contractuales y sanciones impuestas.","Obra, Interventoría, Consultoría, Servicios",Verifica que el valor asegurado cubra el porcentaje legal o reglamentario (entre 10% y 20% del valor total) con vigencia igual al plazo de ejecución y la fase de liquidación.  
"Salarios, Prestaciones Sociales e Indemnizaciones","Incumplimiento de las obligaciones laborales, prestacionales e indemnizaciones del contratista frente al personal asignado al proyecto.","Obra, Interventoría, Consultoría, Servicios","Comprueba coberturas de entre el 5% y el 15% del valor total contractual, exigiendo una vigencia igual al plazo de ejecución contractual y tres (3) años más."  
Calidad del Servicio / Bienes,"Deficiencias técnicas, fallas operativas o deficiente calidad de los bienes entregados o servicios prestados a la entidad.","Consultoría, Servicios, Interventoría",Verifica que la vigencia inicie desde la entrega/recibo a satisfacción y se extienda por el período especificado en el pliego tipo o normativa aplicable.  
Estabilidad de la Obra y Calidad de la Misma,"Deterioros, ruina o vicios redhibitorios que surjan en la obra ejecutada por causas imputables a la construcción o insumos.",Obra pública,Exige vigencia posterior a la firma del Acta de Recibo Definitivo (mínimo 5 años para obras infraestructura) por el porcentaje estipulado sobre el valor final ejecutado.  
Responsabilidad Civil Extracontractual (RCE),Perjuicios patrimoniales y extrapatrimoniales causados a terceros o bienes derivados de la ejecución de las actividades contractuales.,"Obra, Interventoría","Exige amparos de predios, labores y operaciones, con límites asegurados mínimos expresados en SMMLV conforme a las escalas fijadas por los pliegos tipo."  
**Diferenciación Técnica: Garantía de Seriedad de la Oferta vs. Garantías Contractuales Definitivas:**  De conformidad con el parágrafo 3 del artículo 5 de la Ley 1150 de 2007 (adicionado por el artículo 5 de la Ley 1882 de 2018), la omisión en la entrega de la  *garantía de seriedad de la oferta*  junto con la propuesta inicial constituye un defecto  **insubsanable de origen**  y es causal directa de rechazo de la propuesta en la fase de selección.  
Por el contrario, respecto de las  *garantías contractuales definitivas*  (de cumplimiento, anticipo, RCE, entre otras), la falta de suficiencia en sus montos o vigencias detectada tras la adjudicación o durante la ejecución no acarrea el rechazo del proponente, sino que activa un flujo automatizado de requerimiento normativo. El sistema notifica al contratista para que subsane, aclare o expida un anexo modificatorio a la póliza en un término determinado, supeditando el inicio de las obras o la autorización de los desembolsos a la previa emisión del visto bueno de aprobación por parte de la entidad estatal.

###### *2.2. Tablero de Control de Vigencias, Cuotas y Alertas Preventivas*

El sub-módulo de alertas preventivas procesará diariamente el estado de caducidad de cada amparo mediante los siguientes eventos programados:

1. **Alerta Preventiva Nivel 1 (30 Días Antes del Vencimiento):**  Notificación automatizada vía correo electrónico y panel de control dirigida al Contratista, Supervisor/Interventor y Ordenador del Gasto, solicitando el inicio del trámite de renovación o ampliación del amparo.  
2. **Alerta Crítica Nivel 2 (15 Días Antes del Vencimiento):**  Emisión de un requerimiento formal al Contratista para radicar el anexo modificatorio. El sistema aplica un  **bloqueo preventivo**  en el módulo de facturación, impidiendo la radicación de futuras cuentas de cobro.  
3. **Alerta Extraordinaria Nivel 3 (5 Días Antes del Vencimiento):**  Notificación de urgencia con copia automatizada a la Oficina de Control Interno y a la Dirección Jurídica para estructurar el inicio del procedimiento sancionatorio o apremio administrativo por riesgo de desamparo.  
4. **Alerta de Vencimiento y Bloqueo Operativo (Día 0):**  Asignación automática del estado "Garantía Vencida". Congelamiento de las interfaces de pago en SIIF/ERP territorial y emisión de informe para la declaración de siniestro o caducidad.

**Tratamiento de Modificaciones Contractuales:**  Ante solicitudes de suspensión, adición financiera o prórroga en el tiempo, el sistema exige como precondición obligatoria la carga del Anexo Aclaratorio o Modificatorio de la Póliza. El motor de firmas impedirá la suscripción digital de las actas de suspensión, adición o prórroga si la garantía no ha sido previamente modificada y aprobada por la entidad.

###### *2.3. Flujo Automatizado de Actualización de Amparos en SECOP II ante Modificaciones*

En atención al principio de inalterabilidad de los requisitos legales y al deber del contratista de mantener la suficiencia ininterrumpida de las garantías durante toda la vida contractual y sus etapas posteriores, el sistema aplicará las siguientes validaciones:  
Tipo de Modificación Contractual,Efecto sobre la Póliza,Validación Automatizada del Sistema  
Adición Presupuestal / Aumento de Valor,"Incremento proporcional de la suma asegurada en las coberturas de Cumplimiento, Salarios, RCE y Buen Manejo del Anticipo (si aplica).",Comprueba que el valor asegurado se incremente en la misma proporción del valor adicionado. Impedirá el registro del acta si el valor asegurado es insuficiente.  
Prórroga del Plazo de Ejecución,"Ampliación de la fecha de vencimiento de las coberturas de Cumplimiento, Salarios, RCE y Calidad del Servicio.",Recalcula el vencimiento legal y valida que el anexo cubra la totalidad del nuevo plazo más el término reglamentario fijado para la liquidación contractual.  
Suspensión Temporal de la Ejecución,Ajuste o prórroga de las vigencias para compensar el período de paralización de las actividades físicas.,Exige la carátula o anexo modificatorio que extienda la fecha de vencimiento por un término igual al período de suspensión acordado previo al reinicio.

##### 3\. SEGUIMIENTO DE LA EJECUCIÓN, ACTAS, FACTURACIÓN Y LIQUIDACIÓN CONTRACTUAL

###### *3.1. Control de Ejecución Presupuestal/Física e Informes de Interventoría*

Para garantizar la trazabilidad de la ejecución conforme a los parámetros del Modelo Integrado de Planeación y Gestión (MIPG) del DAFP, el sistema estructurará el acceso, firma y gestión contractual mediante la siguiente matriz de roles y responsabilidades:

* **Comités Estructuradores y Evaluadores:**  Rol de configuración y lectura. Validan la coincidencia de las matrices de entregables e hitos financieros configurados en el sistema con las condiciones aprobadas en el pliego de condiciones y en el informe de evaluación definitivo.  
* **Unidad de Interventoría (Externa) / Supervisión (Interna):**  Rol de verificación técnica y aprobación de primer nivel. Responsable de validar el avance físico ejecutado, certificar el recibo a satisfacción de entregables, revisar el informe mensual de actividades, auditar las planillas de seguridad social y firmar técnicamente las actas de avance antes de su pase a cobro.  
* **Ordenador del Gasto:**  Rol de autorización administrativa e imputación final. Autoriza formalmente el pago sobre las actas parciales aprobadas por la supervisión, valida la suficiencia presupuestal residual y firma las resoluciones de pago e imprevistos.

**Requisitos Documentales Obligatorios para Radicación de Cuentas:**

1. Informe mensual de supervisión/interventoría debidamente diligenciado y firmado digitalmente.  
2. Acta de avance parcial o final de obra/servicio que detalle las cantidades ejecutadas e hitos alcanzados.  
3. Evidencias de soporte físico o técnico (registros fotográficos georreferenciados, bitácoras digitales, ensayos de laboratorio o entregables documentales).  
4. Paz y salvo de aportes al Sistema de Seguridad Social Integral y Parafiscales emitido por el Representante Legal o Revisor Fiscal.  
5. Factura electrónica de venta emitida en formato XML/PDF con validación previa de la DIAN.

###### *3.2. Trazabilidad de Facturación Electrónica e Interoperabilidad con SIIF Nación / Sistemas Locales*

El sub-módulo de gestión de pagos automatizará la validación financiera y contable mediante la siguiente arquitectura de integraciones:

* **Radicación y Recepción de la Factura Electrónica:**  
* Ingreso del archivo XML y representación gráfica PDF de la factura electrónica enviada por el contratista.  
* Consumo automático del servicio web de la DIAN mediante API REST para verificar la validez del Código Único de Factura Electrónica (CUFE) y el estado del documento contable.  
* **Verificación Automatizada de Reglas de Negocio:**  
* *Webhook con PILA:*  Consulta automatizada a operadores de información PILA para validar la autenticidad de la planilla y el pago efectivo de cotizaciones de la nómina asignada al contrato.  
* *Validación de Pólizas:*  Verificación síncrona en el módulo de garantías para constatar que la póliza se encuentre vigente y con amparos aprobados.  
* **Aprobación y Cadena de Vistos Buenos:**  
* Emisión de la conformidad digital de la Supervisión/Interventoría sobre el acta de avance correspondiente.  
* Validación y firma de la orden de pago por parte del Ordenador del Gasto.  
* **Transmisión Operativa e Interoperabilidad Financiera:**  
* Envío de la estructura de datos (payload XML/JSON) vía Web Service SOAP/REST al sistema SIIF Nación o ERP territorial.  
* Generación automática de la Obligación Presupuestal y asignación de turno de pago en la Tesorería de la entidad.

**Indicadores de Gestión del Tiempo de Trámite (KPI):**

* *Tiempo de Radicación a Aprobación de Supervisión (*  *\$KPI\_1*\$  *):*  Máximo 5 días hábiles.  
* *Tiempo de Tramitación Financiera u Ordenación de Pago (*  *\$KPI\_2*\$  *):*  Máximo 10 días hábiles.  
* *Alerta por Ineficiencia Administrativa:*  Disparo automático de notificación de incumplimiento de términos a la Oficina de Control Interno si el proceso acumula más de 15 días hábiles en trámite sin justificación registrada.

###### *3.3. Módulo de Cierre, Liquidación Contractual y Paz y Salvos Finales*

De acuerdo con lo previsto en el artículo 11 de la Ley 1150 de 2007, la liquidación del contrato estatal se estructurará sobre las siguientes reglas de negocio:

* **Liquidación de Mutuo Acuerdo:**  Procedimiento de balance de cuentas bilateral que debe surtirse en el término fijado en los pliegos de condiciones o, a falta de estipulación, dentro de los cuatro (4) meses siguientes al vencimiento del plazo de ejecución contractual.  
* **Liquidación Unilateral:**  Potestad excepcional ejercida por la administración mediante acto administrativo motivado dentro de los dos (2) meses siguientes al vencimiento del término para liquidar de mutuo acuerdo, cuando el contratista no concurra o las partes no alcancen un acuerdo.

**Cronómetro de Control de Plazos Legales y Caducidad:**  El sistema configurará un cronómetro regresivo que emitirá alertas a la entidad sobre el vencimiento de los cuatro (4) meses para liquidar de mutuo acuerdo y de los dos (2) meses para la liquidación unilateral, evitando la pérdida o caducidad de la potestad liquidatoria de la administración.  
**Lista de Verificación Final para el Cierre Definitivo:**

* Certificado consolidado de paz y salvo final de aportes a la seguridad social y parafiscales por todo el tiempo de ejecución del contrato.  
* Finiquito financiero que evidencie el cruce de cuentas, la devolución de saldos no ejecutados y la cancelación de compromisos presupuestales en el SIIF/ERP.  
* Aprobación de pólizas postcontractuales requeridas (Estabilidad de la Obra, Calidad del Servicio/Bienes, o Buen Manejo de Equipos).  
* Suscripción de la minuta digital del Acta de Liquidación Definitiva y expedición del Certificado de Cierre en SECOP II.

##### 4\. REPORTE HISTÓRICO Y MATRIZ DE EXPERIENCIA ACREDITABLE Y RUP

###### *4.1. Ingesta Automática al 'Banco de Experiencia' con UNSPSC y SMMLV*

Al perfeccionarse la liquidación o cierre definitivo del contrato, el módulo de inteligencia de datos migrará la información contractual al "Banco de Experiencia" del contratista aplicando las siguientes reglas de indexación y catalogación:  
**Fórmula de Conversión a SMMLV:**   \$\$\\text{Valor Ejecutado (SMMLV)} \= \\frac{\\text{Valor Final Ejecutado y Liquidado del Contrato (\\\$)}}{\\text{Valor del SMMLV a la Fecha de Terminación del Contrato (\\\$)}}\$\$  
*Regla de Negocio Bloqueante:*  El sistema utilizará como divisor el Salario Mínimo Mensual Legal Vigente correspondiente al año de la  **fecha de terminación del contrato** . El motor rechazará automáticamente cualquier intento de indexación que utilice el SMMLV de la fecha de inicio, adjudicación o suscripción del contrato.  
**Catalogación mediante Códigos UNSPSC:**  El contrato ejecutado se asociará a los códigos del Clasificador de Bienes y Servicios de Naciones Unidas (UNSPSC) asignados desde el pliego tipo inicial y validados en el informe final de supervisión.  
**Acreditación de Estados Financieros para Sociedades Nuevas:**  Tratándose de sociedades de reciente constitución que no cuenten con la antigüedad suficiente para expedir estados financieros auditados con corte a 31 de diciembre, la información financiera y sus indicadores operacionales se tomarán de los  **estados financieros de apertura**  o  **estados financieros trimestrales**  reportados e inscritos en el RUP, conforme al artículo 2.2.1.1.1.5.2 del Decreto 1082 de 2015 y al Concepto C-837 de 2022 de la ANCP-CCE.

###### *4.2. Certificaciones Asistidas para Actualización/Renovación en el RUP*

El Registro Único de Proponentes (RUP), regulado en el artículo 6.1 de la Ley 1150 de 2007, constituye  **plena prueba**  de la capacidad jurídica, financiera, organizacional y de la experiencia de los interesados en contratar con el Estado.

* **Fecha Límite Obligatoria de Renovación:**  La información para renovar el RUP debe presentarse a más tardar el  **quinto día hábil del mes de abril de cada año**  (Art. 2.2.1.1.1.5.1 del Decreto 1082 de 2015, Conceptos C-525 de 2026 y C-423 de 2021). De no radicarse la información en dicho plazo legal, el RUP sufrirá la  **cesación de sus efectos** , perdiendo su vigencia y su condición de plena prueba.

**Estados del RUP y Reglas de Firmeza (Art. 87 CPACA y Art. 6.3 Ley 1150 de 2007):**

* **En Trámite de Renovación:**  Aplica cuando el proponente radica la documentación antes del quinto día hábil de abril. Entre el momento de la solicitud de renovación y el de la firmeza del nuevo acto, el proponente puede participar en procesos de selección haciendo valer la  **información del RUP en firme del año anterior**  ("información antigua"), cuyos efectos no han cesado (Conceptos C-423 de 2021 y C-525 de 2026).  
* **En Firme:**  El acto de inscripción, renovación o actualización adquiere firmeza transcurridos diez (10) días hábiles contados a partir de su publicación en la Cámara de Comercio sin que se hayan interpuesto recursos de reposición (Art. 6.3 Ley 1150 de 2007 y Art. 87 CPACA).  
* **Impugnación mediante Recurso de Reposición en Procesos de Selección:**  Si se interpone un  *Recurso de Reposición*  contra la actualización o renovación del RUP durante un proceso de selección en curso, la nueva información impugnada no adquiere ejecutoria y resulta inejecutable. El sistema aplicará la regla fijada en el Concepto  **C-933 de 2026** , evaluando la propuesta con base en la  **información del RUP que se encontraba en firme antes de iniciar el trámite impugnado** , evitando el rechazo automático de la oferta por falta de capacidad o vigencia.  
* **Cesación de Efectos:**  Se produce por no presentar la solicitud de renovación al quinto día hábil de abril. Impide la participación en licitaciones y obliga al proponente a realizar un trámite de inscripción nueva, la cual solo surtirá efectos cuando adquiera firmeza previa al cierre del proceso de selección.

**Eliminación Definitiva de la Regla del "Mejor Año Fiscal":**  Conforme a la doctrina de la ANCP-CCE fijada en los Conceptos  **C-933 de 2026**  y  **C-525 de 2026** , perdió vigencia la norma transitoria derivada de los Decretos 399 de 2021 y 579 de 2021\. En consecuencia,  **queda eliminada la regla del "mejor año fiscal"**  que permitía seleccionar indicadores financieros de los últimos tres (3) años. El sistema evaluará la capacidad financiera y organizacional utilizando  **únicamente la información del RUP en firme del último año fiscal** , tanto para proponentes individuales como para integrantes de consorcios o uniones temporales.

###### *4.3. Matriz Restrictiva de Subsanabilidad y Causales de Rechazo en Procesos Futuros*

El motor de evaluación preventiva aplicará los siguientes criterios normativos y jurisprudenciales sobre las propuestas presentadas en licitaciones futuras:  
Elemento de la Oferta / Documento,Condición de Subsanabilidad (Subsanable / Insubsanable),Fundamento Normativo y Precedente CCE  
"Documentos o Requisitos Habilitantes que NO otorgan puntaje  (Aclaraciones a la experiencia, capacidad jurídica, financiera, RUP).",Subsanable  hasta el término de traslado del informe de evaluación que corresponda a cada modalidad de selección.,"Parágrafo 1, Art. 5 Ley 1882 de 2018; Conceptos ANCP-CCE  C-057 de 2026 ,  C-1376 de 2025 ,  C-518 de 2025  y  C-431 de 2026 ."  
Garantía de Seriedad de la Oferta  no aportada junto con la propuesta inicial.,Insubsanable . Causal de rechazo directo e inmediato de la oferta.,"Parágrafo 3, Art. 5 Ley 1150 de 2007 (adicionado por Ley 1882 de 2018); Conceptos C-057 de 2026 y C-518 de 2025."  
Acreditación de Hechos u Ocurrencias con Posterioridad al Cierre del Proceso.,Insubsanable . Se prohíbe mejorar o completar la oferta con circunstancias sobrevinientes al cierre.,"Parágrafo 1, Art. 5 Ley 1882 de 2018; Conceptos  C-057 de 2026  y  C-1376 de 2025 .  Nota:  Se distingue el  hecho  (ocurrido antes del cierre) de la  prueba  (el documento puede expedirse después si acredita el hecho previo)."  
Reacreditación o Reasignación de un Contrato aportado para puntaje hacia experiencia habilitante.,"Subsanable / Viable , siempre que el contrato o documento haya sido aportado de forma íntegra con la oferta inicial antes del cierre.","Concepto ANCP-CCE  C-431 de 2026 . Al reposar la prueba en la oferta original, no constituye información nueva ni modifica el valor de la oferta; aclara su uso para capacidad."  
No presentar la información para renovar el RUP al quinto día hábil del mes de abril.,Insubsanable . Causal de rechazo de la oferta por cesación de efectos del registro y falta de capacidad legal al cierre.,Literal g de Pliegos Tipo; Art. 2.2.1.1.1.5.1 del Decreto 1082 de 2015; Concepto ANCP-CCE  C-423 de 2021 .  
