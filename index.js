require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const Cursor = require('pg-cursor');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// GET /paises?limit=10&offset=0
// Usa pg-cursor para leer los resultados en bloques de "limit" filas.
app.get('/paises', async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 10;
  const offset = parseInt(req.query.offset, 10) || 0;

  const client = await pool.connect();
  try {
    const query = `
      SELECT p.nombre, p.continente, p.poblacion, pp.pib_2019, pp.pib_2020
      FROM paises p
      LEFT JOIN paises_pib pp ON pp.nombre = p.nombre
      ORDER BY p.nombre
      OFFSET $1
    `;
    const cursor = client.query(new Cursor(query, [offset]));

    // Se pide una fila extra para saber si hay una página siguiente.
    const rows = await new Promise((resolve, reject) => {
      cursor.read(limit + 1, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
    await new Promise((resolve, reject) => cursor.close((err) => (err ? reject(err) : resolve())));

    const hasMore = rows.length > limit;
    res.json({
      data: hasMore ? rows.slice(0, limit) : rows,
      limit,
      offset,
      hasMore,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /paises
// Inserta el país, su PIB y registra la acción (1 = inserción) en una sola transacción.
app.post('/paises', async (req, res) => {
  const { nombre, continente, poblacion, pib_2019, pib_2020 } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El campo "nombre" es obligatorio.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO paises (nombre, continente, poblacion) VALUES ($1, $2, $3)',
      [nombre, continente, poblacion]
    );
    await client.query(
      'INSERT INTO paises_pib (nombre, pib_2019, pib_2020) VALUES ($1, $2, $3)',
      [nombre, pib_2019, pib_2020]
    );
    // paises_data_web tiene PK en nombre_pais: si el país ya tuvo una acción
    // registrada antes (por ejemplo, fue eliminado y se vuelve a agregar),
    // se actualiza la fila en vez de fallar por clave duplicada.
    await client.query(
      `INSERT INTO paises_data_web (nombre_pais, accion) VALUES ($1, 1)
       ON CONFLICT (nombre_pais) DO UPDATE SET accion = 1`,
      [nombre]
    );
    await client.query('COMMIT');
    res.status(201).json({ message: `País "${nombre}" agregado correctamente.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DELETE /paises/:nombre
// Elimina el país (y su PIB) y registra la acción (0 = eliminación) en una sola transacción.
app.delete('/paises/:nombre', async (req, res) => {
  const { nombre } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM paises_pib WHERE nombre = $1', [nombre]);
    const result = await client.query('DELETE FROM paises WHERE nombre = $1', [nombre]);

    if (result.rowCount === 0) {
      throw new Error(`El país "${nombre}" no existe.`);
    }

    await client.query(
      `INSERT INTO paises_data_web (nombre_pais, accion) VALUES ($1, 0)
       ON CONFLICT (nombre_pais) DO UPDATE SET accion = 0`,
      [nombre]
    );
    await client.query('COMMIT');
    res.json({ message: `País "${nombre}" eliminado correctamente.` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
