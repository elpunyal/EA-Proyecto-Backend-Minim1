import mongoose, { HydratedDocument } from 'mongoose';
import Exercise from '../models/Exercise';
import Question, { IQuestion } from '../models/Question';
import { buildPageInfo, escapeRegex, getSkip } from '../utils/pagination';

// Datos necesarios para crear una pregunta.
// El ejercicio llega como texto (ID) desde el cuerpo de la peticion.
export type NewQuestion = Pick<IQuestion, 'title' | 'text'> & { exercise: string };

// Datos que se pueden actualizar de una pregunta
export type UpdateQuestionInput = Pick<IQuestion, 'title' | 'text'>;

// Tipo de un documento de pregunta ya cargado por Mongoose
type QuestionDocument = HydratedDocument<IQuestion>;

// Funcion que se encarga de crear una pregunta en la base de datos.
// El autor no viene del body: el controlador nos pasa el id que sale del token.
// Si el ejercicio no existe (o esta borrado) devolvemos null y el controlador reponde 404.
export const createQuestion = async (data: NewQuestion, authorId: string): Promise<QuestionDocument | null> => {

    // Comprobamos que el ejercicio existe y no esta borrado
    const exercise = await Exercise.findOne({ _id: data.exercise, isDeleted: false });
    if (!exercise) {
        return null;
    }

    // Construimos la pregunta convirtiendo los ids a ObjectId
    const question = new Question({
        title: data.title,
        text: data.text,
        exercise: new mongoose.Types.ObjectId(data.exercise),
        author: new mongoose.Types.ObjectId(authorId)
    });

    // Guardamos la pregunta en la base de datos y devolvemos el resultado
    return question.save();

};

// Funcion que busca una pregunta por su ID en la base de datos.
// El ADMIN consulta todas las preguntas, tambien las borradas logicamente.
// Cualquier otra sesion solo ve las activas: si la pregunta esta borrada se comporta
// como si no existiera y el controlador responde 404.
// El populate carga el ejercicio, el autor y los autores de las repsuestas.
export const getQuestionById = (questionId: string, isAdmin: boolean): Promise<QuestionDocument | null> => {

    // Con el rol ADMIN buscamos por ID a secas; el resto exige ademas isDeleted: false
    const filter = isAdmin ? { _id: questionId } : { _id: questionId, isDeleted: false };

    // acrordarme que no devolver toda la info del autor, solo el name
    return Question.findOne(filter)
        .populate('exercise')
        .populate('author', 'name')
        .populate('answers.author', 'name');

};

// Funcion que se encarga de actualizar una pregunta.
// Filtramos isDeleted: false para que una pregunta borrada logicamente no se pueda
// actualizar (devolvera null y el controlador respondera 404).
export const updateQuestion = (questionId: string, data: UpdateQuestionInput): Promise<QuestionDocument | null> => {

    return Question.findOneAndUpdate({ _id: questionId, isDeleted: false }, data, { new: true })
        .populate('exercise')
        .populate('author', 'name')
        .populate('answers.author', 'name');

};


// Borrado logico: la pregunta sigue en la base de datos, pero marcada como borrada.
// Deja de salir en los listados. Devuelve null si no existe o ya estaba borrada.
export const softDeleteQuestion = (questionId: string): Promise<QuestionDocument | null> => {

    return Question.findOneAndUpdate({ _id: questionId, isDeleted: false }, { isDeleted: true, deletedAt: new Date() }, { new: true });

};

// Borrado definitivo: la pregunta desaparece de la base de datos para siempre.
// Funciona tambien con preguntas ya borradas logicamente.
export const hardDeleteQuestion = (questionId: string): Promise<QuestionDocument | null> => {

    return Question.findByIdAndDelete(questionId);

};

// acordarme q el listado y los filtros van en el comit 3

// Parametros de un listado: los que llegan ya validados por ValidateQuery
export type ListQuestionsInput = { page: number; limit: number; search?: string; exercise?: string };

// Devuelve una pagina de preguntas, filtrada por ejercicio y/o por texto en el titulo o en el texto.
// El ADMIN ve todas las preguntas; cualquier otra sesion solo las activas (isDeleted: false).
export const listQuestions = async ({ page, limit, search, exercise }: ListQuestionsInput, isAdmin: boolean) => {

    // El ADMIN consulta todo, asi que su filtro empieza vacio; el resto empieza solo con las activas
    const filter: Record<string, unknown> = isAdmin ? {} : { isDeleted: false };

    // Filtro exacto por ejercicio, si se ha pedido
    if (exercise) {
        filter.exercise = exercise;
    }

    // Buscador: el texto puede estar en el titulo o en el texto
    if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        filter.$or = [{ title: regex }, { text: regex }];
    }

    // Pedimos la pagina y el total a la vez, con el MISMO filtro
    const [questions, total] = await Promise.all([
        // Ordenamos por la fecha de creacion (y por _id para que el orden no cambie entre paginas)
        Question.find(filter)
            .sort({ createdAt: 1, _id: 1 })
            .skip(getSkip(page, limit))
            .limit(limit)
            .populate('exercise')
            .populate('author', 'name')
            .populate('answers.author', 'name'),
        Question.countDocuments(filter)
    ]);

    return { questions, pagination: buildPageInfo(page, limit, total) };

};

// Funcion que se encarga de añadir una respuesta a una pregunta.
// El autor de la respuesta no viene del body: el controlador nos pasa el id que sale del token.
// Filtramos isDeleted: false para que no se pueda responder una pregunta borrada
// (devolvera null y el controlador respondera 404).
export const addAnswer = (questionId: string, text: string, authorId: string): Promise<QuestionDocument | null> => {

    // $push añade la repsuesta al final del array answers
    return Question.findOneAndUpdate(
        { _id: questionId, isDeleted: false },
        { $push: { answers: { text, author: new mongoose.Types.ObjectId(authorId) } } },
        { new: true }
    )
        .populate('exercise')
        .populate('author', 'name')
        .populate('answers.author', 'name');

};

// Exportamos todas las funciones para poder utilizarlas desde el controlador
export default {

    createQuestion,

    getQuestionById,

    updateQuestion,

    softDeleteQuestion,

    hardDeleteQuestion,

    listQuestions,

    addAnswer

};
