import express from 'express';

import controller from '../controllers/Question';

import { Schemas, ValidateId, ValidateJoi, ValidateQuery } from '../middleware/Joi';
import { RequireRole } from '../middleware/RequireRole';

// Creamos el router que se encargara de las rutas relacionadas con las preguntas
// El token ya se comprueba en server.ts (VerifyToken), asi que aqui siempre hay req.user
const router = express.Router();

// Ruta para crear una pregunta nueva
// Primero comprobamos que los datos cumplen el esquema de Joi
router.post('/', ValidateJoi(Schemas.question.create), controller.createQuestion);

// Ruta para listar preguntas: primero validamos los parametros de la URL
router.get('/', ValidateQuery(Schemas.query.question), controller.listQuestions);

// Ruta para buscar una pregunta por su ID
// Antes de llamar al controlador comprobamos que el ID tiene el formato correcto
router.get('/:questionId', ValidateId('questionId'), controller.readQuestion);

// Ruta para actualizar una pregunta
// Primero comprobamos que el ID sea correcto y despues validamos los datos recibidos
// El controlador comprueba que quien modifica es el autor o un admin
router.put('/:questionId', ValidateId('questionId'), ValidateJoi(Schemas.question.update), controller.updateQuestion);

// Borrado logico: solo marca la pregunta como borrada (comprueba autor o admin en controller)
router.delete('/:questionId', ValidateId('questionId'), controller.softDeleteQuestion);

// Borrado definitivo: elimina la pregunta de la base de datos. Solo ADMIN
router.delete('/:questionId/hard', RequireRole('ADMIN'), ValidateId('questionId'), controller.hardDeleteQuestion);

// Ruta para responder una pregunta (409 si es su propia pregunta)
router.post('/:questionId/answers', ValidateId('questionId'), ValidateJoi(Schemas.question.answer), controller.answerQuestion);

// Exportamos el router para poder utilizar estas rutas en la aplicacion
export = router;
