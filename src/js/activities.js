import { ACTIVITY_OBJECT_STORE_NAME } from "./database-client.js";
/**
 * @typedef Activity
 * @type {object}
 * @property {number} [id]
 * @property {string} name
 */

export class Activities {
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
	findById(id) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const request = objectStore.get(id);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	findByName(id) {
		return new Promise((resolve, reject) => {
			const transaction = this.#database.transaction([this.#objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.#objectStoreName);
			const index = objectStore.index("name");
			const request = index.get(id);
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
				console.log(`Activity ${record.name} already exists`);
				reject(event);
			};
		});
	}
	/**
	 * @returns {Activity}
	 */
	static recordForInsert() {
		return {
			name: undefined
		};
	}
}
