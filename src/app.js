// Type definitions
/**
 * @typedef Student
 * @type {object}
 * @property {number} [id]
 * @property {string} name
 * @property {StudentConfig} config
 * @property {number[]} activities
 */

/**
 * @typedef StudentConfig
 * @type {object}
 * @property {string} color
 */

/**
 * @typedef Activity
 * @type {object}
 * @property {number} [id]
 * @property {string} name
 */

/**
 * @typedef Occurrence
 * @type {object}
 * @property {number} [id]
 * @property {number} activityId
 * @property {number} studentId
 * @property {string} timestamp
 */

// Globals
const DATABASE_VERSION = 2;
const DATABASE_NAME = "students";
const STUDENT_OBJECT_STORE_NAME = "student";
const ACTIVITY_OBJECT_STORE_NAME = "activity";
const OCCURRENCE_OBJECT_STORE_NAME = "occurrence";

class DatabaseClient {
	#database;
	constructor(database) {
		this.#database = database;
	}
	get students() {
		return new Students(this.#database);
	}
	get activities() {
		return new Activities(this.#database);
	}
	get occurrences() {
		return new Occurrences(this.#database);
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
				console.log(database.objectStoreNames);

				console.log("Creating object stores");
				if (!database.objectStoreNames.contains(STUDENT_OBJECT_STORE_NAME)) {
					const studentObjectStore = database.createObjectStore(STUDENT_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
					studentObjectStore.createIndex("name", "name", { unique: true });
					console.log(`Created ${STUDENT_OBJECT_STORE_NAME} store`);
				}
				else {
					console.log("Object store already exists:", STUDENT_OBJECT_STORE_NAME);
				}

				if (!database.objectStoreNames.contains(ACTIVITY_OBJECT_STORE_NAME)) {
					const activityObjectStore = database.createObjectStore(ACTIVITY_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
					activityObjectStore.createIndex("name", "name");
					console.log(`Created ${ACTIVITY_OBJECT_STORE_NAME} store`);
				}
				else {
					console.log("Object store already exists:", ACTIVITY_OBJECT_STORE_NAME);
				}

				if (!database.objectStoreNames.contains(OCCURRENCE_OBJECT_STORE_NAME)) {
					const occurrenceObjectStore = database.createObjectStore(OCCURRENCE_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
					occurrenceObjectStore.createIndex("studentId", "studentId");
					occurrenceObjectStore.createIndex("activityId", "activityId");
					console.log(`Created ${OCCURRENCE_OBJECT_STORE_NAME} store`);
				}
				else {
					console.log("Object store already exists:", OCCURRENCE_OBJECT_STORE_NAME);
				}

				client = new this(database);
				resolve(client);
			};
		});
	}

	clearStore(storeName) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([storeName], "readwrite");
			const objectStore = transaction.objectStore(storeName)
			const request = objectStore.clear();

			request.onsuccess = (event) => {
				console.log(`Store ${storeName} successfully cleared`);
				if (event.result != null) {
					console.log("Something weird happened though:", event);
				}
				resolve(event);
			}
			request.onerror = (event) => {
				console.error(`Unable to clear store ${storeName}`);
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

class Students {
	#database;
	#objectStoreName = STUDENT_OBJECT_STORE_NAME;

	constructor(database) {
		this.#database = database;
	}

	getAll() {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.getAll();
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	findById(studentId) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.get(studentId);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	findByName(studentName) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const index = objectStore.index("name")
			const request = index.get(studentName);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	insert(record) {
		if (record.id) {
			delete record.id;
		}
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.add(record);
			request.onsuccess = (_event) => {
				console.log(`Added student ${record.name}: `, request.result);
				resolve(request.result);
			};
			request.onerror = (event) => {
				console.error(`Unable to add student ${record.name} (likely because they already exist)`);
				reject(event);
			}
		});
	}

	delete(student) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
			const request = objectStore.delete(student[objectStore.keyPath]);
			request.onsuccess = (event) => {
				console.log(`Deleted student: `, student.name);
				resolve(event);
			};
			request.onerror = (event) => {
				console.error(`Unable to delete student ${student.name}`);
				reject(event);
			}
		});
	}

	/**
	 * @param {Student} student
	 * @param {Activity} activity
	 * @returns {Promise<Student>}
	 */
	trackActivity(student, activity) {
		student.activities.push(activity.id);
		return this.update(student);
	}

	/**
	 * @param {Student} student
	 * @param {Activity} activity
	 * @returns {Promise<Student>}
	 */
	untrackActivity(student, activity) {
		const idx = student.activities.findIndex((activityId) => activityId === activity.id);
		student.activities.splice(idx, 1);
		return this.update(student);
	}

	// This expects a fully formed student object
	async update(record) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.put(record);
			request.onsuccess = (_event) => {
				console.log(`Updated student ${record.name}`, request.result);
				resolve(request.result);
			}
			request.onerror = (event) => {
				console.error(`Unable to update student ${record.name}`)
				reject(event);
			};
		});
	}

	/**
	 * @returns {Student}
	 */
	static recordForInsert() {
		return {
			// NB: This field is required to not be present on insert
			// id: undefined,
			name: undefined,
			activities: [],
			config: {}
		}
	}
}

class Activities {
	#database;
	#objectStoreName = ACTIVITY_OBJECT_STORE_NAME;
	constructor(database) {
		this.#database = database;
	}
	getAll() {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.getAll();
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	/**
	 * @returns {Promise<number>}
	 */
	insert(record) {
		if (record.id) {
			delete record.id;
		}
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.add(record);
			request.onsuccess = (_event) => {
				console.log(`Added activity ${record.name}: `, request.result);
				resolve(request.result);
			};
			request.onerror = (event) => {
				console.error(`Unable to add activity ${record.name}`);
				reject(event);
			}
		});
	}
	/**
	 * @returns {Activity}
	 */
	static recordForInsert() {
		return {
			name: undefined
		}
	}
}

class Occurrences {
	#database;
	#objectStoreName = OCCURRENCE_OBJECT_STORE_NAME;
	constructor(database) {
		this.#database = database;
	}
	getAll() {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.getAll();
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	findByStudentId(student) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const index = objectStore.index("studentId");
			const request = index.getAll(student.id);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}

	async removeByStudentId(student) {
		const request = this.#getStudentCursorRequest(student);
		return new Promise((resolve, reject) => {
			request.onsuccess = (_event) => {
				const cursor = request.result;
				if (cursor) {
					cursor.delete(cursor.primaryKey);
					cursor.continue();
				}
				resolve(true);
			};
			request.onerror = (event) => reject(event);
		});
	}

	#getStudentCursorRequest(student) {
		const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
		const objectStore = transaction.objectStore(this.#objectStoreName);
		const index = objectStore.index("studentId");
		const request = index.openCursor(IDBKeyRange.only(student.id));
		return request;
	}
	/**
	 * @returns {Promise<number>}
	 */
	insert(occurrence) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.add(occurrence);
			request.onsuccess = (_event) => {
				console.log(`Added occurrence ${occurrence.timestamp}: `, request.result);
				resolve(request.result);
			};
			request.onerror = (event) => {
				console.error(`Unable to add occurrence ${occurrence.timestamp}`);
				reject(event);
			}
		});
	}
	/**
	 * @returns {Occurrence}
	 */
	static recordForInsert() {
		return {
			activityId: undefined,
			studentId: undefined,
			timestamp: undefined,
		}
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
	let permission = false;
	// Request notification permission
	try {
		permission = await Notification.requestPermission();
	}
	catch (e) {
		console.log("Could not get notification permisson, likely because we are on mobile")
	}
	console.log("Notification permission", permission);
	// Containers and buttons
	// const clearStudentsStoreButton = document.getElementById(`clear-${STUDENT_OBJECT_STORE_NAME}-store`);
	// const clearActivitiesButton = document.getElementById(`clear-${ACTIVITY_OBJECT_STORE_NAME}-store`);
	const deleteDatabaseButton = document.getElementById("delete-database");
	const studentsContainer = document.getElementById("students");
	const addStudentForm = document.getElementById("add-student");
	const toggleResultsButton = document.getElementById("toggle-results")
	const resultsContainer = document.getElementById("results");
	const exportResultsButton = document.getElementById("export-results");

	// Event listeners
	console.log(`Creating global event listeners for ${STUDENT_OBJECT_STORE_NAME} store`);
	// clearStudentsStoreButton.addEventListener("click", (event) => {
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// 	client.clearStore(STUDENT_OBJECT_STORE_NAME);
	// 	const studentsContainer = document.getElementById("students");
	// 	studentsContainer.replaceChildren();
	// });

	// clearActivitiesButton.addEventListener("click", async (event) => {
	// 	event.preventDefault();
	// 	event.stopPropagation();
	// 	const students = await client.students.getAll(); {
	// 		for (const student of students) {
	// 			await client.clearStudentActivities(student.id);
	// 		}
	// 	}
	// 	const studentsContainer = document.getElementById("students");
	// 	const activitiesContainers = studentsContainer.getElementsByClassName("student-activities");
	// 	for (const element of activitiesContainers) {
	// 		element.replaceChildren();
	// 	}
	// 	if (toggleResultsButton.dataset.toggle === "open") {
	// 		createResults();
	// 	}
	// });

	deleteDatabaseButton.addEventListener("click", (event) => {
		event.preventDefault();
		event.stopPropagation();
		client.deleteDatabase();
		window.location.reload();
	});

	toggleResultsButton.addEventListener("click", async (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (toggleResultsButton.dataset.toggle == "closed") {
			createResults();
		}
		else {
			toggleResultsButton.dataset.toggle = "closed";
			toggleResultsButton.textContent = "Show Activities";
			resultsContainer.replaceChildren();
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
			const student = Students.recordForInsert();
			student.name = studentName;
			student.config.color = studentColor;
			student.id = await client.students.insert(student);
			if (permission === "granted") {
				new Notification("Student added", { body: `Successfully added student ${studentName}` });
			}
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
		const students = await client.students.getAll();
		const activities = await client.activities.getAll();
		let csv = ["Student name,Activity name,Timestamp"];
		for (const student of students) {
			const occurrences = await client.occurrences.findByStudentId(student.id);
			for (const occurrence of occurrences) {
				const activity = activities.find((activity) => activity.id === occurrence.activityId);
				const row = `${student.name},${activity.name},"${occurrence.timestamp}"`;
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
		// Get the student template
		const template = document.getElementById("student");
		const element = document.importNode(template.content, true);
		const studentForm = element.querySelector(".student-activity-form");

		// Set the container id
		const container = element.querySelector(".student");
		container.id = `student-${student.id}`;

		// Set the background color
		if (student.config?.color) {
			container.style.backgroundColor = student.config.color;
		}

		// Set the student name
		const studentNameHeader = element.querySelector(".student-name");
		studentNameHeader.textContent = student.name;

		// Set the submit button value
		const studentFormSubmitButton = element.querySelector(`input[type="submit"]`);
		studentFormSubmitButton.value = `Add activity for ${student.name} `;

		// Get activity template
		studentForm.addEventListener("submit", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			const form = event.target;
			const formData = new FormData(form);
			const activityName = formData.get("activity-name");
			const activity = Activities.recordForInsert();
			activity.name = activityName;
			activity.id = await client.activities.insert(activity);
			console.log(activity);
			await client.students.trackActivity(student, activity);
			const studentContainer = document.getElementById(container.id);
			const activitiesContainer = studentContainer.querySelector(".student-activities");
			const activityElement = createActivityElement(student, activity);
			activitiesContainer.appendChild(activityElement);
			studentForm.reset();
		});

		const deleteStudentButton = container.querySelector(".delete-student");
		deleteStudentButton.addEventListener("click", async (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (confirm(`Are you sure you want to delete ${student.name}?`)) {
				await client.students.delete(student);
				container.remove();
				if (permission === "granted") {
					new Notification("Student deleted", { body: `Deleted ${student.name}` });
				}
				if (toggleResultsButton.dataset.toggle === "open") {
					createResults();
				}
			}
		});

		return element;
	};

	const createActivityElement = (student, activity) => {
		const template = document.getElementById("activity");
		const element = document.importNode(template.content, true);
		const container = element.querySelector(".activity-buttons");
		const id = `activity-${activity.id}`;
		container.id = id;

		const activityNameElement = element.querySelector(".activity-name");
		activityNameElement.textContent = activity.name;
		const recordActivityButton = element.querySelector(".record-occurrence-button");
		recordActivityButton.addEventListener("click", async () => {
			const occurrence = Occurrences.recordForInsert();
			occurrence.activityId = activity.id;
			occurrence.studentId = student.id;
			occurrence.timestamp = Temporal.Now.instant().toLocaleString();
			occurrence.id = await client.occurrences.insert(occurrence);
			if (permission === "granted") {
				new Notification("Occurrence recorded", { body: `Recorded ${activity.name} occurrence for ${student.name}` });
			}
			if (toggleResultsButton.dataset.toggle === "open") {
				createResults();
			}
		});

		const removeOccurrencesButton = element.querySelector(".remove-occurrence-button");
		removeOccurrencesButton.addEventListener("click", async () => {
			await client.occurrences.removeByStudentId(student);
			if (permission === "granted") {
				new Notification("Occurrences removed", { body: `Removed ${activity.name} occurrences for ${student.name}` });
			}
			if (toggleResultsButton.dataset.toggle === "open") {
				createResults();
			}
		});

		const untrackActivityButton = element.querySelector(".untrack-activity-button");
		untrackActivityButton.addEventListener("click", async () => {
			await client.students.untrackActivity(student, activity);
			if (permission === "granted") {
				new Notification("Occurrence tracking removed", { body: `No longer tracking ${activity.name} occurrences for ${student.name}` });
			}
			container.remove();
		});

		return element;
	};

	const createResults = async () => {
		toggleResultsButton.dataset.toggle = "open";
		toggleResultsButton.textContent = "Hide Activities"
		const students = await client.students.getAll();
		const activities = await client.activities.getAll();
		const resultsTemplate = document.getElementById("activities");
		const resultsElement = document.importNode(resultsTemplate.content, true);
		const recordsContainer = resultsElement.querySelector(".records");
		const recordTemplate = document.getElementById("record");
		for (const student of students) {
			const occurrences = await client.occurrences.findByStudentId(student);
			for (const occurrence of occurrences) {
				const activity = activities.find((activity) => occurrence.activityId === activity.id);
				const recordElement = document.importNode(recordTemplate.content, true);
				recordElement.querySelector(".name").textContent = student.name;
				recordElement.querySelector(".activity").textContent = activity.name;
				recordElement.querySelector(".timestamp").textContent = occurrence.timestamp;
				recordsContainer.appendChild(recordElement);
			}
		}
		resultsContainer.replaceChildren(resultsElement);
	}

	try {
		const students = await client.students.getAll();
		const activities = await client.activities.getAll();
		for (const student of students) {
			const studentElement = createStudentElement(student);
			studentsContainer.appendChild(studentElement);
			if (student.activities?.length > 0) {
				const studentContainer = document.getElementById(`student-${student.id}`);
				const activitiesContainer = studentContainer.querySelector(".student-activities");
				for (const activityId of student.activities) {
					const activity = activities.find((activity) => activity.id === activityId);
					const activityElement = createActivityElement(student, activity);
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
