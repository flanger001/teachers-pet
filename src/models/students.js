import { Database } from "./database";

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
export class Students extends Database {
	constructor(database, objectStoreName) {
		super(database, objectStoreName);
	}
	/**
	 * @param {Student} student
	 * @param {Activity} activity
	 * @returns {Promise<Student>}
	 */
	trackActivity(student, activity) {
		if (!student.activities.includes(activity.id)) {
			student.activities.push(activity.id);
		}
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
