import { createContext, useState, useContext, useEffect, useId } from "react"
import "./App.css"
import { initializeDatabaseClient } from "./models/client";
import { Students } from "./models/students";
import { Activities } from "./models/activities";
import { Occurrences } from "./models/occurrences";

const DatabaseContext = createContext(null);
const StudentsContext = createContext(null);
const ActivitiesContext = createContext(null);
const OccurrencesContext = createContext(null);
const StudentContext = createContext(null);
const ThemeContext = createContext(null);
const formatter = new Intl.DateTimeFormat("en-us", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h12"
});
const notify = (message, body) => {
	if (!("Notification" in window)) {
		return;
	}
	if (Notification.permission === "granted") {
		new Notification(message, { body })
	}
	else if (Notification.permission === "denied") {
		Notification.requestPermission().then((permission) => {
			if (permission === "granted") {
				new Notification(message, { body });
			}
		});
	}
};
let debounceTimeout;
const debounce = (fn) => {
	if (debounceTimeout) {
		clearTimeout(debounceTimeout);
	}
	debounceTimeout = setTimeout(fn, 250);
};

function DatabaseProvider({ children, client, students, setStudents, activities, setActivities, occurrences, setOccurrences }) {
	return (
		<DatabaseContext value={client}>
			<StudentsContext value={{ students, setStudents }}>
				<ActivitiesContext value={{ activities, setActivities }}>
					<OccurrencesContext value={{ occurrences, setOccurrences }}>
						{children}
					</OccurrencesContext>
				</ActivitiesContext>
			</StudentsContext>
		</DatabaseContext>
	)
}

function App() {
	const [client, setClient] = useState(null);
	const [clientLoaded, setClientLoaded] = useState(false);
	const [students, setStudents] = useState([]);
	const [activities, setActivities] = useState([]);
	const [occurrences, setOccurrences] = useState([]);
	const datalistId = useId();
	const [showResults, setShowResults] = useState(() => {
		const toggleCached = window.localStorage.getItem("toggle-state");
		return toggleCached === "open" ? true : false;
	});
	const [theme, setTheme] = useState(() => window.localStorage.getItem("theme") || "light");

	useEffect(() => {
		initializeDatabaseClient().then((db) => {
			setClient(db);
			setClientLoaded(true);
			console.log("Loading records");
			db.students.getAll().then((result) => {
				setStudents(result);
			});
			db.occurrences.getAll().then((result) => {
				setOccurrences(result.sort((a, b) => {
					switch (true) {
						case a.id > b.id: return -1;
						case a.id < b.id: return 1;
						default: return 0;
					}
				}));
			});
			db.activities.getAll().then((result) => {
				setActivities(result);
			});
		});
	}, []);

	useEffect(() => {
		if (!showResults) {
			window.localStorage.setItem("toggle-state", "closed");
		}
		else {
			window.localStorage.setItem("toggle-state", "open");
		}
	}, [showResults]);

	useEffect(() => {
		if (theme === "dark") {
			document.documentElement.dataset.theme = "dark";
		}
		else {
			document.documentElement.dataset.theme = "light";
		}
	}, [theme]);

	const toggleTheme = () => {
		if (theme === "light") {
			window.localStorage.setItem("theme", "dark");
			setTheme("dark");
		}
		else {
			window.localStorage.setItem("theme", "light");
			setTheme("light");
		}
	};

	return (
		clientLoaded &&
		<>
			<header className="site-banner">
				<h1 className="text-center">Student Activity Log</h1>
			</header>
			<main>
				<ThemeSelector theme={theme} toggleTheme={toggleTheme} />
				<DatabaseProvider
					client={client}
					students={students}
					setStudents={setStudents}
					activities={activities}
					setActivities={setActivities}
					occurrences={occurrences}
					setOccurrences={setOccurrences}
				>
					<ActivitiesDatalist id={datalistId}></ActivitiesDatalist>
					<ThemeContext value={theme}>
						<AdminPanel setShowResults={setShowResults}></AdminPanel>
						<StudentsContainer />
					</ThemeContext>
					{showResults && <OccurrencesContainer />}
				</DatabaseProvider>
			</main>
			<footer>
				<p>All data is stored locally. You can download it with the "Export Activities" button.</p>
			</footer>
		</>

	)
}

function ThemeSelector({ theme, toggleTheme }) {
	return (
		<div className="theme-selector">
			<label className="sr-only" htmlFor="theme-selector">Theme</label>
			<button type="button" role="switch" id="theme-selector" onClick={toggleTheme}>
				{
					theme === "light" ?
						(
							<svg
								viewBox="0 0 24 24"
								fill="none"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="light"
							>
								<path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" className="path1"></path>
								<path d="M12 4v1M17.66 6.344l-.828.828M20.005 12.004h-1M17.66 17.664l-.828-.828M12 20.01V19M6.34 17.664l.835-.836M3.995 12.004h1.01M6 6l.835.836" className="path2"></path>
							</svg>

						) : (
							<svg viewBox="0 0 24 24" fill="none" className="dark">
								<path fillRule="evenodd" clipRule="evenodd" d="M17.715 15.15A6.5 6.5 0 0 1 9 6.035C6.106 6.922 4 9.645 4 12.867c0 3.94 3.153 7.136 7.042 7.136 3.101 0 5.734-2.032 6.673-4.853Z" className="path1"></path>
								<path d="m17.715 15.15.95.316a1 1 0 0 0-1.445-1.185l.495.869ZM9 6.035l.846.534a1 1 0 0 0-1.14-1.49L9 6.035Zm8.221 8.246a5.47 5.47 0 0 1-2.72.718v2a7.47 7.47 0 0 0 3.71-.98l-.99-1.738Zm-2.72.718A5.5 5.5 0 0 1 9 9.5H7a7.5 7.5 0 0 0 7.5 7.5v-2ZM9 9.5c0-1.079.31-2.082.845-2.93L8.153 5.5A7.47 7.47 0 0 0 7 9.5h2Zm-4 3.368C5 10.089 6.815 7.75 9.292 6.99L8.706 5.08C5.397 6.094 3 9.201 3 12.867h2Zm6.042 6.136C7.718 19.003 5 16.268 5 12.867H3c0 4.48 3.588 8.136 8.042 8.136v-2Zm5.725-4.17c-.81 2.433-3.074 4.17-5.725 4.17v2c3.552 0 6.553-2.327 7.622-5.537l-1.897-.632Z" className="path2"></path><path fillRule="evenodd" clipRule="evenodd" d="M17 3a1 1 0 0 1 1 1 2 2 0 0 0 2 2 1 1 0 1 1 0 2 2 2 0 0 0-2 2 1 1 0 1 1-2 0 2 2 0 0 0-2-2 1 1 0 1 1 0-2 2 2 0 0 0 2-2 1 1 0 0 1 1-1Z" className="path3"></path>
							</svg>
						)
				}
			</button>
		</div>
	)
}

function OccurrencesContainer() {
	const { students } = useContext(StudentsContext);
	const { activities } = useContext(ActivitiesContext);
	const { occurrences, setOccurrences } = useContext(OccurrencesContext);
	const mappedOccurrences = occurrences.map((occurrence) => {
		let student = students.find((student) => student.id === occurrence.studentId);
		if (!student) {
			student = { name: "Unknown" };
		}
		const activity = activities.find((activity) => activity.id === occurrence.activityId);
		return {
			studentName: student.name,
			activityName: activity.name,
			...occurrence
		}
	});

	return (
		<div className="results-container">
			<h2 className="results-container__header">Occurrences list</h2>
			<div className="results">
				<table className="occurrences-table">
					<thead>
						<tr className="header-row">
							<th>Student name</th>
							<th>Activity</th>
							<th>Timestamp</th>
							<th></th>
						</tr>
					</thead>
					<tbody className="records">
						{mappedOccurrences.map((occurrence) => <Occurrence key={occurrence.id} occurrence={occurrence} setOccurrences={setOccurrences} />)}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function Occurrence({ occurrence }) {
	const client = useContext(DatabaseContext);
	const { setOccurrences } = useContext(OccurrencesContext);
	const deleteOccurrence = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!confirm("Delete occurrence?")) {
			return;
		}
		await client.occurrences.delete(occurrence);
		setOccurrences((occurrences) => occurrences.filter((o) => o.id !== occurrence.id));
	}

	return (
		<tr className="occurrence-row">
			<td className="name">{occurrence.studentName}</td>
			<td className="activity">{occurrence.activityName}</td>
			<td className="timestamp">{occurrence.timestamp}</td>
			<td className="actions"><button className="delete-button button" onClick={deleteOccurrence}>×</button></td>
		</tr>
	)
}

function ActivitiesDatalist({ student = null, id }) {
	const { activities } = useContext(ActivitiesContext);
	const filteredActivities = student ? activities.filter((activity) => !student.activities.includes(activity.id)) : activities;

	return (
		<datalist id={id}>
			{filteredActivities.map((activity) => <option key={activity.id} value={activity.name} />)}
		</datalist>
	)
}

function AdminPanel({ setShowResults }) {
	const client = useContext(DatabaseContext);
	const { setStudents } = useContext(StudentsContext);
	const deleteDatabase = (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!confirm("Delete database? This will remove all records and reload the page.")) {
			return;
		}
		client.deleteDatabase();
		window.location.reload();
	};
	const addStudent = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const form = event.target;
		try {
			const formData = new FormData(form);
			const studentName = formData.get("student-name");
			const studentColor = formData.get("student-color");
			const student = Students.recordForInsert();
			student.name = studentName;
			student.config.color = studentColor;
			student.id = await client.students.insert(student);
			notify("Student added", `Successfully added student ${studentName}`);
			setStudents((students) => {
				return [...students, student];
			});
			form.reset();
		}
		catch (error) {
			console.error(error);
			alert("Student already exists");
		}
		finally {
			form.reset();
		}
	};
	const toggleShowResults = () => setShowResults((showResults) => !showResults);
	const exportActivities = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const students = await client.students.getAll();
		const activities = await client.activities.getAll();
		let csv = ["Occurrence ID,Student ID,Student name,Activity ID,Activity name,Timestamp"];
		for (const student of students) {
			const occurrences = await client.occurrences.findByStudentId(student.id);
			for (const occurrence of occurrences) {
				const activity = activities.find((activity) => activity.id === occurrence.activityId);
				const row = `${occurrence.id},${student.id},${student.name},${activity.id},${activity.name},"${occurrence.timestamp}"`;
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
	}

	return (
		<div className="admin-controls-container">
			<h2 className="admin-controls-container__header">Admin controls</h2>
			<div className="admin-controls">
				<form className="form add-student-form" onSubmit={addStudent}>
					<div className="form-control">
						<label className="label sr-only" htmlFor="student-name">New student name</label>
						<input className="input-text" type="text" name="student-name" placeholder="New student name (required)" required />
					</div>
					<div className="form-control">
						<label className="label" htmlFor="student-color">Color</label>
						<input className="input-color" type="color" name="student-color" defaultValue="#e0e0ff" />
					</div>
					<div className="form-control">
						<button className="input-submit button" type="submit">Add new student</button>
					</div>
				</form>
				<div className="admin-actions">
					<button className="button" onClick={deleteDatabase}>Delete Database</button>
					<button className="button" onClick={toggleShowResults}>Toggle Activities</button>
					<button className="button" onClick={exportActivities}>Export Activities</button>
				</div>
			</div>
		</div>
	)
}

function StudentsContainer() {
	const { students } = useContext(StudentsContext);

	return (
		<div className="students-container">
			<h2 className="students-container__header">Students list</h2>
			<div className="students">
				{students.map((student) => <Student key={student.id} student={student} />)}
			</div>
		</div>
	)
}

function Student({ student }) {
	const client = useContext(DatabaseContext);
	const theme = useContext(ThemeContext)
	const { setStudents } = useContext(StudentsContext);
	const { activities, setActivities } = useContext(ActivitiesContext);
	const { setOccurrences } = useContext(OccurrencesContext);
	const studentActivities = activities.filter((activity) => student.activities.includes(activity.id));
	const datalistId = useId();
	const trackActivity = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const form = event.target;
		const formData = new FormData(form);
		const activityName = formData.get("activity-name");
		let activity;
		try {
			activity = Activities.recordForInsert();
			activity.name = activityName;
			activity.id = await client.activities.insert(activity);
			setActivities((activities) => [activity, ...activities]);
		}
		catch (error) {
			// Activity already exists
			console.log("Activity already exists", error);
			activity = await client.activities.findByName(activityName);
		}
		if (!student.activities.includes(activity.id)) {
			await client.students.trackActivity(student, activity);
			setStudents((students) => (
				students.map((s) => {
					if (s.id === student.id) {
						s.activities.push(activity.id);
					}
					return s;
				})
			));
		}
		else {
			notify("Activity already tracked", `Activity ${activity.name} already tracked for ${student.name}`);
		}
		form.reset();
	};
	const deleteStudent = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (confirm(`Are you sure you want to delete ${student.name} and all their behavior records?`)) {
			await client.students.delete(student);
			await client.occurrences.removeByStudentId(student);
			setStudents((students) => students.filter((s) => s.id !== student.id))
			setOccurrences((occurrences) => occurrences.filter((o) => o.studentId !== student.id))
			notify("Student deleted", `Deleted ${student.name}`);
		}
	};

	const updateColor = (event) => debounce(
		async () => {
			const color = event.target.value;
			student.config.color = color;
			await client.students.update(student);
			setStudents((students) => (
				students.map((s) => {
					if (s.id === student.id) {
						s.config.color = color;
					}
					return s;
				})
			));
		}
	);

	const updateName = (event) => debounce(
		async () => {
			const name = event.target.value;
			student.name = name;
			await client.students.update(student);
			setStudents((students) => (
				students.map((s) => {
					if (s.id === student.id) {
						s.name = name;
					}
					return s;
				})
			));
		}
	);

	return (
		<StudentContext value={student}>
			<div className="student" style={{ backgroundColor: student.config.color }}>
				<div className="student-controls">
					<label className="label sr-only" htmlFor="student-name">Student name</label>
					<input className="student-name" name="student-name" defaultValue={student.name} style={{ backgroundColor: student.config.color }} onFocus={(event) => event.target.style.backgroundColor = theme === "light" ? "#fff" : "#222"} onBlur={(event) => event.target.style.backgroundColor = student.config.color} onChange={updateName} />
					<label className="label sr-only" htmlFor="student-color">Student color</label>
					<input className="input-color" type="color" name="student-color" onChange={updateColor} defaultValue={student.config.color} title="Student color" />
					<button className="button delete-button" title="Delete Student" onClick={deleteStudent}>×</button>
				</div>
				<form className="form student-activity-form" onSubmit={trackActivity}>
					<div className="form-control">
						<label className="label sr-only" htmlFor="activity">New activity name</label>
						<input className="input-text" type="text" name="activity-name" placeholder="Select or add activity to track here" list={datalistId} required />
					</div>
					<div className="form-control">
						<input className="input-submit button" type="submit" value="Track activity" />
					</div>
				</form>
				<div className="student-activities">
					<ActivitiesDatalist student={student} id={datalistId}></ActivitiesDatalist>
					<h4>Tracked activities</h4>
					{studentActivities.map((activity) => (
						<StudentActivity key={activity.id} student={student} activity={activity} />
					))}
				</div>
			</div>
		</StudentContext>
	)
}

function StudentActivity({ activity }) {
	const student = useContext(StudentContext);
	const client = useContext(DatabaseContext);
	const { setStudents } = useContext(StudentsContext);
	const { setOccurrences } = useContext(OccurrencesContext);
	const recordOccurrence = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		const occurrence = Occurrences.recordForInsert();
		occurrence.activityId = activity.id;
		occurrence.studentId = student.id;
		occurrence.timestamp = formatter.format(new Date())
		occurrence.id = await client.occurrences.insert(occurrence);
		setOccurrences((occurrences) => [occurrence, ...occurrences]);
		notify("Occurrence recorded", `Recorded ${activity.name} occurrence for ${student.name}`);
	};
	const removeOccurrences = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!confirm(`Remove all occurrences of ${activity.name} for ${student.name}?`)) {
			return;
		}
		await client.occurrences.removeByStudentId(student);
		setOccurrences((occurrences) => (
			occurrences.filter((occurrence) => {
				if (occurrence.studentId === student.id) {
					return occurrence.activityId !== activity.id;
				}
				return true;
			})
		))
		notify("Occurrences removed", `Removed ${activity.name} occurrences for ${student.name}`);
	};
	const untrackActivity = async (event) => {
		event.preventDefault();
		event.stopPropagation();
		if (!confirm(`Stop tracking ${activity.name} for ${student.name}?`)) {
			return;
		}
		await client.students.untrackActivity(student, activity);
		setStudents((students) => (
			students.map((s) => {
				if (s.id === student.id) {
					const activityIndex = s.activities.findIndex((a) => activity.id === a.id);
					s.activities.splice(activityIndex, 1);
				}
				return s;
			})
		));
		notify("Occurrence tracking removed", `No longer tracking ${activity.name} occurrences for ${student.name}`);
	};

	return (
		<section className="activity" key={activity.id}>
			<h5 className="activity-name text-center">{activity.name}</h5>
			<div className="activity-controls">
				<button className="button record-occurrence" onClick={recordOccurrence}>Record occurrence</button>
				<button className="button remove-occurrence" onClick={removeOccurrences}>Remove all occurrences</button>
				<button className="button untrack-activity" onClick={untrackActivity}>Stop tracking</button>
			</div>
		</section>
	)
}

export default App
