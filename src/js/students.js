import { STUDENT_OBJECT_STORE_NAME } from "./database-client.js"

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

export class Students {
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
			const index = objectStore.index("name");
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
			};
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
			};
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
			};
			request.onerror = (event) => {
				console.error(`Unable to update student ${record.name}`);
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
		};
	}
}
