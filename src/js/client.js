import { Activities } from "./activities.js";
import { Occurrences } from "./occurrences.js";
import { Students } from "./students.js";

export const DATABASE_VERSION = 3;
export const DATABASE_NAME = "students";
export const STUDENT_OBJECT_STORE_NAME = "student";
export const ACTIVITY_OBJECT_STORE_NAME = "activity";
export const OCCURRENCE_OBJECT_STORE_NAME = "occurrence";

export class Client {
	constructor(database) {
		this.database = database;
	}
	get students() {
		return new Students(this.database, STUDENT_OBJECT_STORE_NAME);
	}
	get activities() {
		return new Activities(this.database, ACTIVITY_OBJECT_STORE_NAME);
	}
	get occurrences() {
		return new Occurrences(this.database, OCCURRENCE_OBJECT_STORE_NAME);
	}
	deleteDatabase() {
		return new Promise((resolve, reject) => {
			this.database.close();
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

export const initializeDatabaseClient = () => {
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

			client = new Client(database);
			resolve(client);
		};
		dbOpenRequest.onupgradeneeded = async (event) => {
			console.log(`Database on version ${event.oldVersion}, upgrade to ${event.newVersion} requested`);
			database = event.target.result;

			console.log("Initializing database");
			switch (true) {
				case event.oldVersion < 1: {
					// Students
					const studentObjectStore = database.createObjectStore(STUDENT_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
					studentObjectStore.createIndex("name", "name", { unique: true });
					console.log(`Created ${STUDENT_OBJECT_STORE_NAME} store`);
				}
				case event.oldVersion < 2: {
					// Activities and occurrences
					const activityObjectStore = database.createObjectStore(ACTIVITY_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
					activityObjectStore.createIndex("name", "name");
					console.log(`Created ${ACTIVITY_OBJECT_STORE_NAME} store`);
					const occurrenceObjectStore = database.createObjectStore(OCCURRENCE_OBJECT_STORE_NAME, { keyPath: "id", autoIncrement: true });
					occurrenceObjectStore.createIndex("studentId", "studentId");
					occurrenceObjectStore.createIndex("activityId", "activityId");
					console.log(`Created ${OCCURRENCE_OBJECT_STORE_NAME} store`);
					break;
				}
				case event.oldVersion < 3: {
					// Activities migration
					const transaction = event.target.transaction;
					const activityObjectStore = transaction.objectStore(ACTIVITY_OBJECT_STORE_NAME);
					const studentObjectStore = transaction.objectStore(STUDENT_OBJECT_STORE_NAME);
					const occurrenceObjectStore = transaction.objectStore(OCCURRENCE_OBJECT_STORE_NAME);
					const activitiesRequest = activityObjectStore.getAll();

					activitiesRequest.onsuccess = (_activitiesEvent) => {
						const activities = activitiesRequest.result;
						const studentsRequest = studentObjectStore.getAll();

						studentsRequest.onsuccess = (_studentsEvent) => {
							const students = studentsRequest.result;
							const occurrenceRequest = occurrenceObjectStore.getAll();

							occurrenceRequest.onsuccess = (_occurrenceEvent) => {
								const occurrences = occurrenceRequest.result;
								const seenActivities = [];

								for (const activity of activities) {
									const oldActivity = seenActivities.find((a) => activity.name === a.name);
									if (!oldActivity) {
										// Keep old activities and move on
										seenActivities.push(activity);
										continue;
									}
									// Otherwise, we have a duplicate
									for (const occurrence of occurrences) {
										if (occurrence.activityId === activity.id && occurrence.activityId !== oldActivity.id) {
											occurrence.activityId = oldActivity.id;
											occurrenceObjectStore.put(occurrence);
										}
									}
									for (const student of students) {
										if (student.activities.includes(activity.id)) {
											console.log(student);
											console.log(activity)
											const idx = student.activities.findIndex((a) => activity.id === a);
											student.activities.splice(idx, 1);
											student.activities.push(oldActivity.id);
											studentObjectStore.put(student);
										}
									}
									activityObjectStore.delete(activity[activityObjectStore.keyPath]);

								}
								activityObjectStore.deleteIndex("name");
								activityObjectStore.createIndex("name", "name", { unique: true });
							}
						}
					}
				}
				default: break;
			}

			client = new Client(database);
			resolve(client);
		};
	});
}
