export class Database {
	database;
	objectStoreName;
	constructor(database, objectStoreName) {
		this.database = database;
		this.objectStoreName = objectStoreName;
	}
	getAll() {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const request = objectStore.getAll();
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	findById(id) {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const request = objectStore.get(id);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	findByName(id) {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readonly");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const index = objectStore.index("name");
			const request = index.get(id);
			request.onsuccess = (_event) => resolve(request.result);
			request.onerror = (event) => reject(event);
		});
	}
	insert(record) {
		if (record.id) {
			delete record.id;
		}
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const request = objectStore.add(record);
			request.onsuccess = (_event) => {
				console.log(`Added ${this.objectStoreName}${record.name ? ` ${record.name}` : ""}:`, request.result);
				resolve(request.result);
			};
			request.onerror = (event) => {
				console.error(`Unable to add ${this.objectStoreName}${record.name ? ` ${record.name}` : ""}`);
				reject(event);
			};
		});
	}
	delete(record) {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const request = objectStore.delete(record[objectStore.keyPath]);
			request.onsuccess = (event) => {
				console.log(`Deleted ${this.objectStoreName}: `, record.name || record.id);
				resolve(event);
			};
			request.onerror = (event) => {
				console.error(`Unable to delete ${this.objectStoreName} ${record.name || record.id}`);
				reject(event);
			};
		});
	}
	update(record) {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const request = objectStore.put(record);
			request.onsuccess = (_event) => {
				console.log(`Updated ${this.objectStoreName} ${record.name}`, request.result);
				resolve(request.result);
			};
			request.onerror = (event) => {
				console.error(`Unable to update ${this.objectStoreName} ${record.name}`);
				reject(event);
			};
		});
	}
	clearStore() {
		return new Promise((resolve, reject) => {
			const transaction = this.database.transaction([this.objectStoreName], "readwrite");
			const objectStore = transaction.objectStore(this.objectStoreName);
			const request = objectStore.clear();

			request.onsuccess = (event) => {
				console.log(`Store ${this.objectStoreName} successfully cleared`);
				if (event.result != null) {
					console.log("Something weird happened though:", event);
				}
				resolve(event);
			};
			request.onerror = (event) => {
				console.error(`Unable to clear store ${this.objectStoreName}`);
				console.log(event);
				reject(event);
			};
		});
	}
}
