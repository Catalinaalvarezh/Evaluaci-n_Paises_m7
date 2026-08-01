# Evaluación: Sistema de Gestión de Países y PIB

## Objetivos de la Aplicación
Este proyecto es una solución full-stack desarrollada para administrar una base de datos de países y sus indicadores económicos. Los objetivos principales del desarrollo son:

* **Backend robusto:** Crear una API REST en Node.js que administre tablas interconectadas mediante la librería `pg`.
* **Manejo avanzado de consultas:** Implementar `pg-cursor` para la entrega eficiente de registros en bloques (paginación).
* **Integridad de datos:** Aplicar un manejo estricto de transacciones SQL (`COMMIT` y `ROLLBACK`) para garantizar que las inserciones y eliminaciones en cascada entre las tablas `paises`, `paises_pib` y `paises_data_web` se realicen sin corromper la base de datos.
* **Frontend interactivo:** Proveer una interfaz de usuario que permita consultar la lista de países eligiendo la cantidad de registros a visualizar (5, 10 o 20), además de contar con formularios validados para agregar nuevos países o eliminar existentes, capturando y mostrando ordenadamente los errores provenientes del servidor.

## Autora
Catalina Álvarez Hernando

## Enlace del Repositorio
 https://github.com/Catalinaalvarezh/Evaluaci-n_Paises_m7 

