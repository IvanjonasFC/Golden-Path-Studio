# Registry shadcn privado

El Vault expone cada componente en el formato **registry-item de shadcn**, así que
puedes instalarlo en cualquier proyecto (no solo React) con el CLI de shadcn.

## Rutas

- `GET /r/<slug>.json` — un componente. El `<slug>` es el id del Vault con los `:`
  cambiados por `__` (p.ej. `uiverse:Buttons:autor_x-1` → `uiverse__Buttons__autor_x-1`).
- `GET /r/c/<slug>.json` — una colección/perfil entera (todos sus ficheros en un item).

En la web, el detalle de cada componente y de cada colección ya trae el botón
**“Copiar”** con el comando listo (usa el origin actual: `localhost` en dev, tu dominio en prod).

## Usar en otro proyecto

En el proyecto destino, una vez (si no lo está):

```bash
npx shadcn@latest init
```

Luego, con el Vault **arrancado** (`npm run dev` → http://localhost:3000) o desplegado:

```bash
# un componente
npx shadcn@latest add http://localhost:3000/r/magicui__Text__shiny-text.json

# un perfil entero (tu marca / stack)
npx shadcn@latest add http://localhost:3000/r/c/mi-marca.json
```

El código cae en tu proyecto con sus dependencias. No hace falta desplegar nada:
sirve con la web local encendida.

## Notas y límites

- **Brilla con componentes React** (Magic UI, Aceternity, shadcn, Cult, Kokonut):
  `type` = `registry:component`, se colocan según tu `components.json`.
- Los **CSS/HTML de Uiverse** se sirven como `registry:file` con un `target`
  (`components/vault/uiverse/<fichero>.html`). Funciona, pero para esos el copiar-pegar
  del código sigue siendo lo más cómodo.
- El item incluye el `content` inline (es lo que espera el CLI al leer una URL), más
  un bloque `meta` con fuente, licencia y atribución (shadcn lo ignora).
- Respeta licencias: todo el catálogo precargado es MIT.
