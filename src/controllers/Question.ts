import { NextFunction, Request, Response } from 'express';
import QuestionService from '../services/QuestionService';

// Función para crear una pregunta nueva
// El autor sale del token (req.user), nunca del body
const createQuestion = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const question = await QuestionService.createQuestion(req.body, req.user!.id);

        // Si el ejercicio no existe devolvemos un error 404
        if (!question) {
            return res.status(404).json({ message: 'exercise not found' });
        }

        // console.log('pregunta creada con exito:', question._id);
        // El codigo 201 indica que se ha creado un recurso nuevo
        res.status(201).json({ question });
    } catch (error) {
        next(error);
    }
};

// Función para buscar una pregunta concreta a partir de su ID
const readQuestion = async (req: Request<{ questionId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID de la pregunta que viene en los parametros de la URL
    const questionId = req.params.questionId;

    try {
        // El servicio necesita saber el rol de la sesion: solo un ADMIN ve las preguntas borradas
        const isAdmin = req.user?.role === 'ADMIN';

        const question = await QuestionService.getQuestionById(questionId, isAdmin);

        if (question) {
            res.status(200).json({ question });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para listar preguntas con paginación y buscador
const listQuestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user?.role === 'ADMIN';

        // ValidateQuery ya ha comprobado y convertido los parametros de la URL
        const result = await QuestionService.listQuestions(res.locals.query, isAdmin);

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

// Función para modificar una pregunta: solo su autor o un ADMIN
const updateQuestion = async (req: Request<{ questionId: string }>, res: Response, next: NextFunction) => {
    const questionId = req.params.questionId;

    try {
        const isAdmin = req.user?.role === 'ADMIN';

        // Primero buscamos la pregunta para saber quien es su autor
        const found = await QuestionService.getQuestionById(questionId, isAdmin);
        if (!found) {
            return res.status(404).json({ message: 'not found' });
        }

        // Si no es el autor ni un admin devolvemos un error 403
        // comprobar que sea el creador o un admin
        if (String(found.author._id) !== req.user!.id && !isAdmin) {
            return res.status(403).json({ message: 'Solo el autor o un admin puede modificar la pregunta' });
        }

        const question = await QuestionService.updateQuestion(questionId, req.body);

        if (question) {
            res.status(200).json({ question });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para el borrado lógico: solo su autor o un ADMIN
const softDeleteQuestion = async (req: Request<{ questionId: string }>, res: Response, next: NextFunction) => {
    const questionId = req.params.questionId;

    try {
        const isAdmin = req.user?.role === 'ADMIN';

        const found = await QuestionService.getQuestionById(questionId, isAdmin);
        if (!found) {
            return res.status(404).json({ message: 'not found' });
        }

        if (String(found.author._id) !== req.user!.id && !isAdmin) {
            return res.status(403).json({ message: 'Solo el autor o un admin puede borrar la pregunta' });
        }

        const question = await QuestionService.softDeleteQuestion(questionId);

        if (question) {
            // 204: se ha hecho y no hay nada que devolver
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para el borrado definitivo: la ruta ya exige ser ADMIN
const hardDeleteQuestion = async (req: Request<{ questionId: string }>, res: Response, next: NextFunction) => {
    try {
        const question = await QuestionService.hardDeleteQuestion(req.params.questionId);

        if (question) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para responder una pregunta. El autor de la respuesta sale del token
const answerQuestion = async (req: Request<{ questionId: string }>, res: Response, next: NextFunction) => {
    const questionId = req.params.questionId;

    try {
        const isAdmin = req.user?.role === 'ADMIN';

        const found = await QuestionService.getQuestionById(questionId, isAdmin);
        if (!found) {
            return res.status(404).json({ message: 'not found' });
        }

        // Regla de negocio: no se puede responder la propia pregunta (error 409)
        // regla del enunciado para evitar auto-respuestas
        if (String(found.author._id) === req.user!.id) {
            return res.status(409).json({ message: 'No puedes responder tu propia pregunta' });
        }

        const question = await QuestionService.addAnswer(questionId, req.body.text, req.user!.id);

        if (question) {
            res.status(201).json({ question });
        } else {
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        next(error);
    }
};

// Exportamos todas las funciones para poder utilizarlas desde las rutas
export default { createQuestion, readQuestion, listQuestions, updateQuestion, softDeleteQuestion, hardDeleteQuestion, answerQuestion };
