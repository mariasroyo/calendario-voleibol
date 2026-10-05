# Calendario Voleibol Madrid

Calendario de Voleibol Guadarrama Negro y CV Majadahonda A.

## Actualización automática

La página es GitHub Pages y no consulta la FMVB desde el navegador. Un GitHub Actions consulta la FMVB cada 5 minutos, genera `data/partidos.json` y publica el resultado. También se puede ejecutar manualmente desde **Actions → Actualizar calendario y publicar → Run workflow**.

Si la FMVB cambia una hora, rival, pabellón o resultado y su página pública ya lo refleja, el siguiente ciclo de GitHub Actions actualizará el calendario.

## Importante

El extractor está preparado para la estructura pública de FMVB, pero si la Federación cambia su HTML será necesario ajustar `scripts/fetch_fmvb.py`.
