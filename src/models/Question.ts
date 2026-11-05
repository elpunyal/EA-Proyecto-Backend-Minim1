import mongoose, { Document, Schema } from 'mongoose';

// Datos de una respuesta. Es un subdocumento que vive dentro de la pregunta.
export interface IAnswer {

    text: string;

    // Usuario que ha escrito la respuesta (sale del token)
    author: mongoose.Types.ObjectId;

    createdAt: Date;

}

// Definimos los datos que puede tener una pregunta.
export interface IQuestion {

    title: string;

    text: string;

    // Ejercicio sobre el que se hace la pregunta
    exercise: mongoose.Types.ObjectId;

    // Usuario que ha hecho la pregunta (sale del token)
    author: mongoose.Types.ObjectId;

    // Respuestas que han dado otros usuarios
    answers: IAnswer[];

    // Marca si la pregunta esta borrada. Las preguntas borradas no se eliminan fisicamente de la base de datos
    isDeleted: boolean;

    deletedAt?: Date;

}

// Esta interfaz junta los datos de la pregunta con las propiedades de un documento de MongoDB
export interface IQuestionModel extends IQuestion, Document {}

// Esquema de cada respuesta (texto, usuario y fecha)
const AnswerSchema: Schema = new Schema(

    {
        // El texto es obligatorio y quitamos los espacios del principio y del final
        text: { type: String, required: true, trim: true },

        // El autor es una referencia al modelo User
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        // La fecha se pone sola al crear la respuesta
        createdAt: { type: Date, default: Date.now }

    }

);

// Definimos el esquema que van a seguir las preguntas en la base de datos
const QuestionSchema: Schema = new Schema(

    {
        // El titulo y el texto son obligatorios
        title: { type: String, required: true, trim: true },

        text: { type: String, required: true, trim: true },

        // El ejercicio y el autor son referencias a los modelos Exercise y User
        exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true },

        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        // Las respuestas son una lista de subdocumentos. Al principio esta vacia
        answers: [AnswerSchema],

        isDeleted: { type: Boolean, default: false },

        deletedAt: { type: Date, default: null }

    },

    {
        timestamps: true,

        versionKey: false

    }

);

// Creamos y exportamos el modelo Question a partir del esquema
export default mongoose.model<IQuestionModel>('Question', QuestionSchema);
