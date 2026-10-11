const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadButton = document.querySelector("#load-btn");
const noteForm = document.querySelector("#note-form");
const titleInput = document.querySelector("#title-input");
const bodyInput = document.querySelector("#body-input");
const submitButton = document.querySelector("#submit-btn");
const statusMessage = document.querySelector("#status");
const notesList = document.querySelector("#notes-list");

async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const responseText = await response.text();
  return {
    data: responseText ? JSON.parse(responseText) : null,
    status: response.status,
  };
}

function showStatus(message, type = "") {
  statusMessage.textContent = message;
  statusMessage.className = type ? `status ${type}` : "status";
}

function createNoteElement(note) {
  const item = document.createElement("li");
  item.className = "note-item";

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title ?? "Untitled note";

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body ?? "";

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", () => deleteNote(note.id, item, deleteButton));

  item.append(title, body, deleteButton);
  return item;
}

function showEmptyState() {
  const item = document.createElement("li");
  item.className = "empty-state";
  item.textContent = "No notes found. Create your first note above.";
  notesList.replaceChildren(item);
}

loadButton.addEventListener("click", async () => {
  loadButton.disabled = true;
  showStatus("Loading notes...");

  try {
    const { data: notes } = await request(`${API_URL}?_limit=10`);
    notesList.replaceChildren();

    if (!Array.isArray(notes) || notes.length === 0) {
      showEmptyState();
      showStatus("No notes found.");
      return;
    }

    const noteElements = notes.map(createNoteElement);
    notesList.replaceChildren(...noteElements);
    showStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch {
    showStatus("Couldn't load notes. Please check your connection and try again.", "error");
  } finally {
    loadButton.disabled = false;
  }
});

noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  if (!title) {
    showStatus("Please enter a title for your note.", "error");
    titleInput.focus();
    return;
  }

  if (title.length > 100) {
    showStatus("Titles must be 100 characters or fewer.", "error");
    titleInput.focus();
    return;
  }

  submitButton.disabled = true;
  showStatus("Creating note...");

  try {
    const { data: note, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });

    notesList.querySelector(".empty-state")?.remove();
    notesList.prepend(createNoteElement(note));
    noteForm.reset();
    showStatus(`Note created (status ${status}, id ${note.id}).`, "success");
  } catch {
    showStatus("Couldn't create the note. Please try again.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

async function deleteNote(noteId, item, button) {
  button.disabled = true;
  showStatus("Deleting note...");

  try {
    await request(`${API_URL}/${encodeURIComponent(noteId)}`, { method: "DELETE" });
    item.remove();
    if (notesList.children.length === 0) {
      showEmptyState();
    }
    // JSONPlaceholder simulates POST and DELETE responses without persisting changes.
    showStatus("Note deleted.", "success");
  } catch {
    showStatus("Couldn't delete the note. Please try again.", "error");
  } finally {
    button.disabled = false;
  }
}