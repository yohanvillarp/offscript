# Contribuir a OFFSCRIPT

## Flujo de trabajo

`main` representa producción: todo cambio debe llegar mediante un pull request en GitHub desde una rama de trabajo. No hagas commits ni pushes directos a `main`. Mantén cada PR enfocado y apto para producción; los cambios urgentes también pasan por revisión.

Antes de trabajar, lee [AGENTS.md](AGENTS.md), [PROJECT.md](docs/PROJECT.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md) y los archivos relacionados con la tarea.

## Preparación

Usa Node.js 24 y npm. Desde la raíz:

```sh
npm ci
npm ci --prefix apps/studio
git config --local commit.template .gitmessage
```

La primera instalación ejecuta `prepare` y activa Husky para este clon. La segunda instala Studio de forma independiente. No se utilizan workspaces. La configuración de la plantilla es local: cada colaborador debe ejecutar ese comando una vez. Usa `git commit` sin `-m` para abrirla.

## Ramas y pull requests

```sh
git switch main
git pull --ff-only origin main
git switch -c feat/short-description
# Implementa y valida un cambio concreto.
npm run check
git add <archivos>
git commit
git push -u origin feat/short-description
```

Abre un PR con base `main`. Usa ramas breves con prefijos como `feat/`, `fix/`, `docs/`, `refactor/`, `chore/` o `hotfix/`. Describe el problema, el resultado, las verificaciones ejecutadas y los riesgos. Resuelve los comentarios antes de fusionar. No fuerces pushes sobre ramas compartidas.

Usa squash merge para integrar cada PR como un commit coherente; su título debe seguir Conventional Commits. Elimina la rama después de fusionar. Una fusión a `main` debe estar lista para producción; este repositorio todavía no configura despliegues automáticos.

## Commits

Se adopta [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/), con [commitlint](https://commitlint.js.org/) y su configuración conventional:

```text
feat(studio): add session filtering
fix(cli): handle interrupted sessions
docs: clarify contribution workflow
```

Formato: `type(scope opcional): descripción`. Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Usa una descripción concreta e imperativa, sin punto final, y una cabecera de hasta 100 caracteres. El scope es opcional y debe describir el área afectada. Evita commits WIP en la historia final.

Separa cuerpo y pie con líneas en blanco. Marca incompatibilidades con `!` y explica la migración en un pie `BREAKING CHANGE:`. Referencia issues cuando corresponda. `.gitmessage` ofrece estas indicaciones al redactar el commit.

## Validación y hooks

| Momento | Regla |
| --- | --- |
| `pre-commit` | Rechaza commits en `main` y ejecuta lint de Studio. |
| `commit-msg` | Valida el mensaje con commitlint. |
| `pre-push` | Rechaza cualquier destino `refs/heads/main` y ejecuta lint y build. |
| GitHub Actions | En PR hacia `main`, valida el título, lint y build; también valida pushes a `main`. |

`npm run check` desde la raíz ejecuta lint y build; el build de Studio incluye la comprobación TypeScript. No hay una suite automatizada de pruebas funcionales todavía. Añade pruebas significativas cuando implementes funcionalidad y documenta lo que realmente ejecutaste.

Los hooks de [Husky](https://typicode.github.io/husky/) son controles locales y pueden omitirse; no sustituyen la protección de GitHub. No los omitas para integrar cambios que fallen. Lint inspecciona el árbol de trabajo, no solo los archivos staged: mantén los commits coherentes.

## Calidad y seguridad

- Código limpio y modular. Respeta el límite de 250 líneas y las excepciones para scripts definidas en AGENTS.md.
- Mantén los límites de arquitectura y usa tokens semánticos en Studio.
- Implementa solo el alcance solicitado; actualiza documentación cuando cambien decisiones aprobadas.
- No incluyas secretos, credenciales ni evidencia sensible. `.env.example` debe contener únicamente valores ficticios.
- No ejecutes acciones destructivas contra software externo sin autorización explícita.

## Protección de main en GitHub

Un administrador debe configurar un ruleset dirigido a `main` y las opciones del repositorio:

1. Exigir pull requests y al menos una aprobación de otra persona; invalidar aprobaciones cuando cambie el código y exigir resolución de conversaciones.
2. Exigir el check `quality`, con la rama actualizada antes de fusionar.
3. Bloquear force pushes y eliminación de `main`; aplicar las reglas también a administradores y evitar bypass rutinario.
4. Exigir historia lineal, habilitar squash merge y deshabilitar merge commits y rebase merge para mantener este flujo.
5. Configurar el título del PR como título predeterminado del squash commit y revisar el mensaje final antes de fusionar.

Estas reglas remotas se documentan aquí; crear archivos locales no las activa. El check aparecerá después de que GitHub ejecute el workflow. Si una opción depende del plan o permisos, el administrador debe confirmar su disponibilidad. No hay un workflow de despliegue ni credenciales de producción configurados por esta contribución.
