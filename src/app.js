// Kelly's project
// Student activity tracker

// Needs a form to add a student
// Needs a form per-student to add activities
// Needs a button per-activity to log said activity

// Globals
const DATABASE_VERSION = 1;
const DATABASE_NAME = "students";
const STUDENT_OBJECT_STORE_NAME = "student";
const ACTIVITY_OBJECT_STORE_NAME = "activity";

class DatabaseClient {
	#database;
	constructor(database) {
		this.#database = database;
	}

	static init() {
		return new Promise((resolve, reject) => {
			let client;
			let database;
			console.log("Opening database");
			const dbOpenRequest = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

			dbOpenRequest.onerror = (event) => {
				alert("Why didn't you let me open a database???");
				reject(event);
			};
			dbOpenRequest.onsuccess = (event) => {
				console.log("Database successfully opened");
				database = event.target.result;

				client = new this(database);
				resolve(client);
			};
			dbOpenRequest.onupgradeneeded = (event) => {
				console.log(`Database on version ${event.oldVersion}, upgrade to ${event.newVersion} requested`);
				database = event.target.result;
				console.log("Creating object stores");

				const studentObjectStore = database.createObjectStore(STUDENT_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
				studentObjectStore.createIndex("name", "name", { unique: true });
				console.log(`Created ${STUDENT_OBJECT_STORE_NAME} store`);

				client = new this(database);
				resolve(client);
			};
		});
	}

	getAllStudents() {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.getAll();
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	findStudentByName(studentName) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const index = objectStore.index("name")
			const request = index.get(studentName);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	findStudentById(studentId) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.get(studentId);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	addStudent(studentName, config) {
		// Create the new empty student record
		const record = { name: studentName, activities: [], occurrences: [], config };

		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.add(record);
			request.onsuccess = (_event) => {
				console.log(`Added student ${studentName}: `, request.result);
				resolve(request.result);
			};
			request.onerror = (event) => {
				console.error(`Unable to add student ${studentName} (likely because they already exist)`);
				reject(event);
			}
		});
	}

	async deleteStudent(studentName) {
		// Find the student first
		const student = await this.findStudentByName(studentName);

		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.delete(student[objectStore.keyPath]);
			request.onsuccess = (event) => {
				console.log(`Deleted student: `, studentName);
				resolve(event);
			};
			request.onerror = (event) => {
				console.error(`Unable to delete student ${studentName}`);
				reject(event);
			}
		});
	}

	async clearStudentActivities(studentId) {
		const student = await this.findStudentById(studentId);
		student.activities = [];
		student.occurrences = [];
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.put(student);
			request.onsuccess = (_event) => {
				console.log(`Cleared activities and occurrences for ${student.name}`);
				resolve(request.result);
			}
			request.onerror = (event) => {
				console.error(`Unable to clear activities and occurrences for ${student.name}`)
				reject(event);
			};
		});
	}

	async addActivityToStudent(studentId, activityName) {
		const student = await this.findStudentById(studentId);
		student.activities.push(activityName);
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.put(student);
			request.onsuccess = (_event) => {
				console.log(`Added activity to ${student.name}`);
				resolve(request.result);
			}
			request.onerror = (event) => {
				console.error(`Unable to add activity to ${student.name}`)
				reject(event);
			};
		});
	}

	async recordStudentActivity(studentName, activityName) {
		// Find the student first
		const student = await this.findStudentByName(studentName);
		// Create the timestamp record and push it to the student's record
		const timestamp = Temporal.Now.instant();
		const activityRecord = { name: activityName, time: timestamp.toString() }
		student.occurrences.push(activityRecord);

		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([STUDENT_OBJECT_STORE_NAME], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.put(student);
			request.onsuccess = (_event) => {
				console.log(`Recorded activity occurrence for ${studentName}`);
				resolve(request.result);
			}
			request.onerror = (event) => {
				console.error(`Unable to record activity occurrence for ${studentName}`)
				reject(event);
			};
		});
	}

	clearStore(storeName) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([storeName], "readwrite");
			const objectStore = transaction.objectStore(storeName)
			const request = objectStore.clear();

			request.onsuccess = (event) => {
				console.log("Store successfully cleared");
				if (event.result != null) {
					console.log("Something weird happened though:", event);
				}
				resolve(event);
			}
			request.onerror = (event) => {
				console.error("Unable to clear store");
				console.log(event);
				reject(event);
			}
		});
	}

	deleteDatabase() {
		return new Promise((resolve, reject) => {
			this.#database.close();
			const idb = window.indexedDB;
			const request = idb.deleteDatabase(DATABASE_NAME);
			request.onsuccess = (event) => {
				console.log("Database successfully deleted");
				resolve(event);
			}
			request.onerror = (event) => {
				console.error("Unable to delete database");
				reject(event);
			}
		});
	}
}

// Utility functions
const randomId = (name) => {
	let result = `${name.toLowerCase()}-`;
	for (let i = 0; i < 6; i++) {
		result += String.fromCharCode(97 + Math.floor(Math.random() * 26));
	}
	return result.replaceAll(/\s+/g, "-");
};

// Set up the app
window.addEventListener("DOMContentLoaded", async () => {
	// Initialize the database client
	const client = await DatabaseClient.init();

	// Request notification permission
	const permission = await Notification.requestPermission();
	console.log("Notification permission", permission);

	// Containers and buttons
	const clearStudentsStoreButton = document.getElementById(`clear-${STUDENT_OBJECT_STORE_NAME}-store`);
	const clearActivitiesButton = document.getElementById("clear-activities");
	const deleteDatabaseButton = document.getElementById("delete-database")
	const toggleResultsButton = document.getElementById("toggle-results")
	const studentsContainer = document.getElementById("students");
	const addStudentForm = document.getElementById("add-student");
	const exportResultsButton = document.getElementById("export-results");

	// Event listeners
	console.log(`Creating global event listeners for ${STUDENT_OBJECT_STORE_NAME} store`);
	clearStudentsStoreButton.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		client.clearStore(STUDENT_OBJECT_STORE_NAME);
		const studentsContainer = document.getElementById("students");
		studentsContainer.textContent = "";
	});

	clearActivitiesButton.addEventListener("click", async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const students = await client.getAllStudents(); {
			for (const student of students) {
				await client.clearStudentActivities(student.id);
			}
		}
		const studentsContainer = document.getElementById("students");
		const activitiesContainers = studentsContainer.getElementsByClassName("student-activities");
		for (const element of activitiesContainers) {
			element.textContent = "";
		}
	});

	deleteDatabaseButton.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		client.deleteDatabase();
		window.location.reload();
	});

	toggleResultsButton.addEventListener("click", async (event) => {
		const resultsContainer = document.getElementById("results");
		event.preventDefault();
		event.stopPropagation();
		if (toggleResultsButton.dataset.toggle == "closed") {
			toggleResultsButton.dataset.toggle = "open";
			toggleResultsButton.textContent = "Hide Activities"
			const students = await client.getAllStudents();
			const resultsTemplate = document.getElementById("activities");
			const resultsElement = document.importNode(resultsTemplate.content, true);
			const recordsContainer = resultsElement.querySelector(".records");
			const recordTemplate = document.getElementById("record");
			for (const student of students) {
				for (const occurrence of student.occurrences) {
					const recordElement = document.importNode(recordTemplate.content, true);
					recordElement.querySelector(".name").textContent = student.name;
					recordElement.querySelector(".activity").textContent = occurrence.name;
					recordElement.querySelector(".timestamp").textContent = occurrence.time;
					recordsContainer.appendChild(recordElement);
				}
			}
			resultsContainer.appendChild(resultsElement);
		}
		else {
			toggleResultsButton.dataset.toggle = "closed";
			toggleResultsButton.textContent = "Show Activities";
			resultsContainer.textContent = "";
		}
	});

	addStudentForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		event.stopPropagation();
		try {
			const form = event.target;
			const formData = new FormData(form);
			const studentName = formData.get("student-name");
			const studentColor = formData.get("student-color");
			const id = await client.addStudent(studentName, { color: studentColor });
			if (permission === "granted") {
				new Notification("Student added", { body: `Successfully added student ${studentName}` });
			}
			const student = await client.findStudentById(id);
			const studentElement = createStudentElement(student);

			studentsContainer.appendChild(studentElement);
			addStudentForm.reset();
		}
		catch (e) {
			console.error(e);
			alert("Student already exists");
		}
	});

	exportResultsButton.addEventListener("click", async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const students = await client.getAllStudents();
		let csv = ["Student name,Activity name,Timestamp"];
		for (const student of students) {
			for (const { name: activityName, time: activityTimestamp } of student.occurrences) {
				const row = `${student.name},${activityName},${activityTimestamp}`;
				csv.push(row);
			}
		}
		const string = csv.join("\n");
		const blob = new Blob([string], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "student-activities.csv";
		a.style.display = "none";
		a.click();
		URL.revokeObjectURL(url);
	});

	const createStudentElement = (student) => {
		// Extract the student variables
		const { name: studentName, id, config } = student;
		// Get the student template
		const template = document.getElementById("student");
		const studentElement = document.importNode(template.content, true);
		const studentForm = studentElement.getElementById("{buttonId}");

		// Set the container id
		const container = studentElement.firstElementChild;
		container.id = `student-${id}`;

		// Set the background color
		if (student.config?.color) {
			container.style.backgroundColor = student.config.color;
		}

		// studentElement.

		// Set the button name
		const studentNameHeader = studentElement.getElementById("{name}-header")
		studentNameHeader.id = `student-${id}-header`;
		studentNameHeader.textContent = studentName;

		// Set the form ID
		studentForm.id = `student-${id}-activities`;

		// Set the submit button ID and value
		const studentFormSubmitButton = studentElement.querySelector(`input[type="submit"]`);
		studentFormSubmitButton.value = `Add activity for ${studentName} `;

		// Get activity template
		studentForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const form = event.target;
			const formData = new FormData(form);
			const activityName = formData.get("activity-name");
			await client.addActivityToStudent(student.id, activityName);
			const studentContainer = document.getElementById(container.id);
			const activitiesContainer = studentContainer.querySelector(".student-activities");
			const activityElement = createActivityElement(student, activityName);
			activitiesContainer.appendChild(activityElement);
		});

		const deleteStudentButton = container.querySelector(".delete-student button");
		deleteStudentButton.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			await client.deleteStudent(studentName);
			const container = document.getElementById(`student-${id}`);
			container.remove();
			if (permission === "granted") {
				new Notification("Student deleted", { body: `Deleted ${studentName}` });
			}
		});

		return studentElement;
	};

	const createActivityElement = (student, activityName) => {
		const template = document.getElementById("activity");
		const activityElement = document.importNode(template.content, true);

		// Set and store the activity ID
		const id = randomId(activityName);

		// Get the activity template
		// Set the button ID and text
		const button = activityElement.getElementById("{activity-name}");
		button.id = id;
		button.textContent = `Record activity: ${activityName}`;
		button.addEventListener("click", () => {
			client.recordStudentActivity(student.name, activityName);
			if (permission === "granted") {
				new Notification("Activity recorded", { body: `Recorded ${activityName} occurrence for ${student.name}` });
			}
		});
		return activityElement;
	};

	try {
		const students = await client.getAllStudents();
		for (const student of students) {
			const studentElement = createStudentElement(student);
			studentsContainer.appendChild(studentElement);
			if (student.activities?.length > 0) {
				const studentContainer = document.getElementById(`student-${student.id}`);
				const activitiesContainer = studentContainer.querySelector(".student-activities");
				for (const activityName of student.activities) {
					const activityElement = createActivityElement(student, activityName);
					activitiesContainer.appendChild(activityElement);
				}
			}
		}
	}
	catch (error) {
		// Database not initialized, therefore there is no data to render.
		// This is not a proper error, so we are swallowing the "error".
		// console.log(error);
	}
});
