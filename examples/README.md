# Ejemplos de desarrollo

`demo-fixtures.json` contiene datos ficticios, sin información bancaria real. `expected` es una referencia para los tests, no una tabla de saldos que deba mostrarse sin calcular. La fecha está congelada para pruebas; usar la fecha real del dispositivo para registros nuevos fuera de esas pruebas.

`shortcut-event.json` es un ejemplo de **nuestro contrato propuesto de API**. No demuestra que iOS entregue estos campos ni estos nombres. El token va en `Authorization: Bearer ...`, nunca en el cuerpo público del ejemplo. El servidor deduce usuario y dispositivo de la credencial. La plantilla debe mapear solo lo que realmente reciba. No inventar campos para hacer que el ejemplo pase.

Los archivos no contienen claves, números de tarjeta ni datos personales financieros.
