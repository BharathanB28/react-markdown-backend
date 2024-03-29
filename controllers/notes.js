const config = require('../utils/config');
const jwt = require('jsonwebtoken');
const notesRouter = require('express').Router();
const Note = require('../models/note');
const User = require('../models/user');

const getTokenFrom = request => {
    const authorization = request.get('Authorization');
    if (authorization && authorization.toLowerCase().startsWith('bearer')) {
        return authorization.substring(7);
    }
    return null;
};

notesRouter.post('/', async (request, response) => {
    // get the new note from the request body
    const noteObject = request.body;

    // get the token from the Authorization header
    const token = getTokenFrom(request);

    // verify the token and decode it to find the user who sent it
    const decodedToken = jwt.verify(token, config.JWT_SECRET);

    // if the token is missing or invalid, return an error
    if (!token || !decodedToken.id) {
        return response.status(401).json({
            error: 'token missing or invalid'
        });
    }

    // if the token is valid, find the document in the users collection that matches the decodedToken id value
    const user = await User.findById(decodedToken.id);

    // create a new note object with the noteObject and the user's id
    const note = new Note({
        content: noteObject.content,
        user: user._id,
    });

    // save the note to the database
    const savedNote = await note.save();

    // add the note's id to the user's notes array property
    user.notes = user.notes.concat(savedNote._id);

    // save the user to the database
    await user.save();

    // return the saved note
    response.json({message: 'Note saved successfully', note: savedNote});
});

// get all the notes of the current user
notesRouter.get('/', async (request, response) => {
    // get the token from the Authorization header
    const token = getTokenFrom(request);

    // verify the token and decode it to find the user who sent it
    const decodedToken = jwt.verify(token, config.JWT_SECRET);

    // if the token is missing or invalid, return an error
    if (!token || !decodedToken.id) {
        return response.status(401).json({
            error: 'token missing or invalid'
        });
    }

    // if the token is valid, find the document in the users collection that matches the decodedToken id value
    const user = await User.findById(decodedToken.id).populate('notes', {
        content: 1,
        createdAt: 1,
    });

    // return the user's notes
    response.json(user.notes);
});

// PUT route to update a note by ID
notesRouter.put('/:id', async (request, response) => {
    // get the token from the Authorization header
    const token = getTokenFrom(request);

    // verify the token and decode it to find the user who sent it
    const decodedToken = jwt.verify(token, config.JWT_SECRET);

    // if the token is missing or invalid, return an error
    if (!token || !decodedToken.id) {
        return response.status(401).json({
            error: 'token missing or invalid'
        });
    }

    // if the token is valid, find the document in the users collection that matches the decodedToken id value
    const user = await User.findById(decodedToken.id);

    // check if the note ID exists in the user's notes array
    if (!user.notes.includes(request.params.id)) {
        return response.status(404).json({
            error: 'Note not found'
        });
    }

    // update the note in the database using findByIdAndUpdate
    await Note.findByIdAndUpdate(request.params.id, { content: request.body.content });

    response.status(200).json({ message: 'Note updated successfully' });
});

// DELETE route to delete a note by ID
notesRouter.delete('/:id', async (request, response) => {
    // get the token from the Authorization header
    const token = getTokenFrom(request);

    // verify the token and decode it to find the user who sent it
    const decodedToken = jwt.verify(token, config.JWT_SECRET);

    // if the token is missing or invalid, return an error
    if (!token || !decodedToken.id) {
        return response.status(401).json({
            error: 'token missing or invalid'
        });
    }

    // if the token is valid, find the document in the users collection that matches the decodedToken id value
    const user = await User.findById(decodedToken.id);

    // check if the note ID exists in the user's notes array
    if (!user.notes.includes(request.params.id)) {
        return response.status(404).json({
            error: 'Note not found'
        });
    }

    // remove the note ID from the user's notes array
    user.notes = user.notes.filter(noteId => noteId !== request.params.id);

    // save the user without the deleted note ID
    await user.save();

    // delete the note from the database using findByIdAndDelete
    await Note.findByIdAndDelete(request.params.id);

    response.status(204).end(); // No Content
});

module.exports = notesRouter;
