import { Database } from "./database.js";

/**
 * @typedef Occurrence
 * @type {object}
 * @property {number} [id]
 * @property {number} activityId
 * @property {number} studentId
 * @property {string} timestamp
 */

export class Occurrences extends Database {
	constructor(database, objectStoreName) {
		super(database, objectStoreName);
	}

	findByStudentId(student) {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const index = objectStore.index("studentId");
			const request = index.getAll(student.id);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	removeByStudentId(student) {
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
		const transaction = this.database.transaction([this.objectStoreName], "readwrite");
		const objectStore = transaction.objectStore(this.objectStoreName);
		const index = objectStore.index("studentId");
		const request = index.openCursor(IDBKeyRange.only(student.id));
		return request;
	}
	/**
	 * @returns {Occurrence}
	 */
	static recordForInsert() {
		return {
			activityId: undefined,
			studentId: undefined,
			timestamp: undefined,
		};
	}
}
