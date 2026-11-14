import { Activities } from "./activities.js";
import { Occurrences } from "./occurrences.js";
import { Students } from "./students.js";
export const DATABASE_VERSION = 2;
export const DATABASE_NAME = "students";
export const STUDENT_OBJECT_STORE_NAME = "student";
export const ACTIVITY_OBJECT_STORE_NAME = "activity";
export const OCCURRENCE_OBJECT_STORE_NAME = "occurrence";

export class DatabaseClient {
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
			const objectStore = transaction.objectStore(storeName);
			const request = objectStore.clear();

			request.onsuccess = (event) => {
				console.log(`Store ${storeName} successfully cleared`);
				if (event.result != null) {
					console.log("Something weird happened though:", event);
				}
				resolve(event);
			};
			request.onerror = (event) => {
				console.error(`Unable to clear store ${storeName}`);
				console.log(event);
				reject(event);
			};
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
			};
			request.onerror = (event) => {
				console.error("Unable to delete database");
				reject(event);
			};
		});
	}
}
