import { Database } from "./database";

/**
 * @typedef Activity
 * @type {object}
 * @property {number} [id]
 * @property {string} name
 */
export class Activities extends Database {
	constructor(database, objectStoreName) {
		super(database, objectStoreName);
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
