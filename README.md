# EA-Proyecto-Backend

## Instalar las dependencias

```
npm install
```

Antes de arrancar, copia la plantilla de variables de entorno. Sin `JWT_SECRET` y `JWT_REFRESH_SECRET` la API
no arranca:

```
cp .env.example .env
```

## Ejecutar

Mientras programas, arranca la API en modo desarrollo; se reinicia sola cada vez que guardas un archivo:

```
npm run dev
```

Comprueba que responde en <http://localhost:1337/ping> (debe devolver `{"hello":"world"}`). La
documentación de la API está en <http://localhost:1337/api-docs>.

Para ejecutar la versión compilada, como en un servidor:

```
npm run build
npm start
```

`npm run build` compila de TypeScript a JavaScript en `build/`. Si cambias el código, vuelve a ejecutarlo
antes de `npm start`.

Para analizar el código con Oxlint (solo `src/`, porque `build/` es código generado):

```
npm run lint
```

Y para aplicar las correcciones automáticas que tenga:

```
npm run lint:fix
```

## Endpoints

Todo salvo `/auth/*`, `/ping` y `/api-docs` pide el token en la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Quién puede | Qué hace |
|---|---|---|---|
| POST | `/auth/register` | cualquiera | Crea un usuario `USER`: 201 `{ user }`, sin token |
| POST | `/auth/login` | cualquiera | Devuelve `{ token, refreshToken, user }` o 401 |
| POST | `/auth/admin/login` | solo `ADMIN` | Login del backoffice: 200 igual que `/auth/login`, 401 si las credenciales no son correctas, 403 si el usuario no es `ADMIN` |
| POST | `/auth/refresh` | su refresh token | Devuelve un `{ token }` nuevo o 401 |
| GET | `/users` | cualquier sesión | Lista de usuarios para el chat: solo `_id` y `name`. Un `ADMIN` ve todos; el resto, solo los activos |
| POST | `/users` | `ADMIN` | Crea un usuario: 201 `{ user }` |
| GET | `/users/:userId` | `ADMIN` | Devuelve `{ user }` o 404 |
| PUT | `/users/:userId` | `ADMIN` | Actualiza el usuario; devuelve `{ user }` y 404 si no existe |
| DELETE | `/users/:userId` | `ADMIN` | Borrado lógico (`isDeleted`): 204 o 404. Un admin no puede borrarse a sí mismo |
| DELETE | `/users/:userId/hard` | `ADMIN` | Borrado definitivo de la base de datos: 204 o 404 |
| GET | `/exercises` | cualquier sesión | Lista paginada de ejercicios, con buscador y filtro por categoría. Un `ADMIN` ve todos; el resto, solo los activos |
| POST | `/exercises` | `ADMIN` | Crea un ejercicio: 201 `{ exercise }` |
| GET | `/exercises/:exerciseId` | cualquier sesión | Devuelve `{ exercise }` o 404. Si el ejercicio está borrado, 404 para quien no es `ADMIN` |
| PUT | `/exercises/:exerciseId` | `ADMIN` | Actualiza el ejercicio; devuelve `{ exercise }` y 404 si no existe o está borrado |
| DELETE | `/exercises/:exerciseId` | `ADMIN` | Borrado lógico (`isDeleted`): 204 o 404 |
| DELETE | `/exercises/:exerciseId/hard` | `ADMIN` | Borrado definitivo; lo quita también de las rutinas: 204 o 404 |
| GET | `/workouts` | cualquier sesión | Lista paginada de rutinas, con buscador y filtro por día. Un `ADMIN` ve todas; el resto, solo las activas |
| POST | `/workouts` | `ADMIN` | Crea una rutina: 201 `{ workout }` |
| GET | `/workouts/:workoutId` | cualquier sesión | Devuelve `{ workout }` con sus ejercicios completos. Si la rutina está borrada, 404 para quien no es `ADMIN` |
| PUT | `/workouts/:workoutId` | `ADMIN` | Actualiza la rutina; devuelve `{ workout }` y 404 si no existe o está borrada |
| DELETE | `/workouts/:workoutId` | `ADMIN` | Borrado lógico (`isDeleted`): 204 o 404 |
| DELETE | `/workouts/:workoutId/hard` | `ADMIN` | Borrado definitivo de la base de datos: 204 o 404 |
| GET | `/ping` | cualquiera | Healthcheck: `{ hello: 'world' }` |

### Quién ve qué

Los listados de ejercicios, rutinas y usuarios, y el detalle de ejercicios y rutinas, son la misma ruta
para todo el mundo; lo que cambia es el contenido según el rol que va dentro del token:

- **`ADMIN`**: consulta todo, también los elementos borrados (`isDeleted: true`).
- **Cualquier otra sesión**: solo los elementos **activos**. Un elemento borrado no sale en los listados y su
  detalle responde 404, como si no existiera.

Un elemento está **activo** cuando su campo `isDeleted` es `false`. El borrado es siempre lógico: el documento
sigue en MongoDB con `isDeleted: true` y `deletedAt` con la fecha, y la API **no tiene ninguna ruta `DELETE`**.
Las escrituras (`POST` y `PUT`) son solo de `ADMIN`.

Sin sesión, cualquier ruta salvo `/auth/*`, `/ping` y `/api-docs` responde 401: el token se comprueba antes de
mirar el rol, y un rol insuficiente responde 403. Un usuario borrado tampoco puede entrar: `POST /auth/login`
y `POST /auth/refresh` responden 401 con sus credenciales, como si no existiera.

Los cuerpos que se envían:

- **Ejercicios**: `name`, `category` (una de `CHEST`, `BACK`, `LEGS`, `SHOULDERS`, `ARMS`, `CORE`, `CARDIO`),
  `sets` y `reps` (enteros, opcionales).
- **Rutinas**: `name`, `description` (opcional), `dayOfWeek` (de `MONDAY` a `SUNDAY`) y `exercises`, que se
  envía como lista de ids de ejercicio y se devuelve como lista de objetos `Exercise` completos al leer por id.
- **Usuarios**: `name`, `email`, `password` (8 caracteres como mínimo) y `role` (`ADMIN` o `USER`).

## Estructura del proyecto

```
src/
  server.ts        Punto de entrada: conecta con MongoDB, registra middleware y rutas, y arranca el servidor y el chat
  seed.ts          Script que llena la base de datos con los datos de ejemplo
  migrate-roles.ts Script de una sola vez: pasa los roles antiguos (admin, user) a ADMIN y USER
  seed-data.ts     Los datos de ejemplo: usuarios, ejercicios y rutinas
  config/
    config.ts        Lee las variables de entorno y las reúne en un objeto config
    swagger.ts       Monta el documento de Swagger con los esquemas de Joi y las rutas
  library/
    Logging.ts       Mensajes de consola con fecha y color (info, warning, error)
  routes/          El mapa de URLs: qué petición va a qué controlador
    Auth.ts, Users.ts, Exercise.ts, Workout.ts
  controllers/     Leen la petición (req), llaman al servicio y eligen la respuesta (res)
    Auth.ts, Users.ts, Exercise.ts, Workout.ts
  services/        Leen y escriben en la base de datos a través de los modelos. No saben que existe HTTP
    AuthService.ts, UserService.ts, ExerciseService.ts, WorkoutService.ts
  models/          Esquemas de Mongoose: qué campos tiene cada documento y de qué tipo
    User.ts, Exercise.ts, Workout.ts, Message.ts
  middleware/      Lo que se ejecuta entre la ruta y el controlador
    VerifyToken.ts   Comprueba el token de la cabecera Authorization y deja el usuario en req.user (401)
    RequireRole.ts   Deja pasar solo a un rol concreto (403)
    Joi.ts           Guardas: validan el body (422) y el id de la URL (400)
    SocketAuth.ts    Lo mismo que VerifyToken, para la conexión del chat
    Cors.ts          Cabeceras de CORS, configuradas con CORS_ORIGIN
    Logger.ts        Escribe en consola cada petición y su código de respuesta
    ErrorHandler.ts  Convierte cualquier error en su código: 400, 401, 404, 409, 422 o 500
  types/           Tipos compartidos: el payload de los tokens, los eventos del chat y req.user de Express
  utils/
    password.ts      Cifra y comprueba contraseñas con scrypt
```

## Presa de decisions

- He triat `Exercise` com a entitat de les preguntes perquè té sentit tenir dubtes sobre els exercicis del gimnàs.
- L'autor no es demana al body: surt del token JWT per seguretat.
- Com a regla del 409, no deixo que ningú respongui la seva pròpia pregunta.

## No implementat

- **Swagger de `/questions`:** No està fet. És l'únic requisit de l'enunciat que continua faltant, ja que per falta de temps no he pogut afegir les anotacions OpenAPI/Swagger dels nous endpoints.
- **Botons de "Borrar" i "Eliminar definitivament" al frontend:** No s'han posat a la pantalla. A l'API està implementat i provat tant el borrat lògic com el definitiu (soft i hard delete), i al servei d'Angular estan els mètodes. Tot i que l'enunciat no demana expressament aquests botons al frontend (es demanaven 3 crides a la pantalla i se'n fan 4), per falta de temps no s'han afegit a la interfície.
