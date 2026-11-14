import { Activities } from "./activities.js";
import { DatabaseClient } from "./database-client.js";
import { Students } from "./students.js";
import { Occurrences } from "./occurrences.js";

// Set up the app
const initializeApp = async () => {
	// Initialize the database client
	const client = await DatabaseClient.init();
	let permission = false;
	// Request notification permission
	try {
		permission = await Notification.requestPermission();
	}
	catch (e) {
		console.log("Could not get notification permisson, likely because we are on mobile");
	}
	console.log("Notification permission", permission);
	// Containers and buttons
	const deleteDatabaseButton = document.getElementById("delete-database");
	const studentsContainer = document.getElementById("students");
	const addStudentForm = document.getElementById("add-student");
	const toggleResultsButton = document.getElementById("toggle-results");
	const resultsContainer = document.getElementById("results");
	const exportResultsButton = document.getElementById("export-results");

	// Event listeners
	console.log(`Creating global event listeners`);

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
			localStorage.setItem("toggle-state", "open");
			createResults();
		}
		else {
			toggleResultsButton.dataset.toggle = "closed";
			localStorage.setItem("toggle-state", "closed");
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
		toggleResultsButton.textContent = "Hide Activities";
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
	};

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
	if (localStorage.getItem("toggle-state") === "open") {
		toggleResultsButton.click();
	}
};

window.addEventListener("DOMContentLoaded", initializeApp);
