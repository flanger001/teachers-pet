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
const formatter = new Intl.DateTimeFormat("en-us", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hourCycle: "h12"
});

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

	return (
		clientLoaded &&
		<>
			<header>
				<h1 className="text-center">Student Activity Log</h1>
			</header>
			<main>
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
					<AdminPanel setShowResults={setShowResults}></AdminPanel>
					<StudentsContainer />
					{showResults && <ResultsPanel />}
				</DatabaseProvider>
			</main>
			<footer>
				<p>All data is stored locally. You can download it with the "Export Activities" button.</p>
			</footer>
		</>

	)
}

function ResultsPanel() {
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
		<table className="activities-table">
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
		<tr className="activity-row">
			<td className="name">{occurrence.studentName}</td>
			<td className="activity">{occurrence.activityName}</td>
			<td className="timestamp">{occurrence.timestamp}</td>
			<td><button className="delete-button button" onClick={deleteOccurrence}>×</button></td>
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
			if (Notification.permission === "granted") {
				new Notification("Student added", { body: `Successfully added student ${studentName}` });
			}
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
		<div className="admin-controls">
			<h2 className="admin-controls__header">Admin controls</h2>
			<form className="form" onSubmit={addStudent}>
				<div className="form-control">
					<label className="label" htmlFor="student-name" placeholder="Student name (required)">Student name</label>
					<input className="input-text" type="text" name="student-name" required />
				</div>
				<div className="form-control">
					<label className="label" htmlFor="student-color">Color</label>
					<input className="input-color" type="color" name="student-color" defaultValue="#e0e0ff" />
				</div>
				<div className="form-control">
					<input className="input-submit button" type="submit" defaultValue="Add student" />
				</div>
			</form>
			<div className="form-control">
				<button className="button" onClick={deleteDatabase}>Delete all data (will reload page)</button>
				<button className="button" onClick={toggleShowResults}>Toggle Activities</button>
				<button className="button" onClick={exportActivities}>Export Activities</button>
			</div>
		</div>
	)
}

function StudentsContainer() {
	const { students, setStudents } = useContext(StudentsContext);
	const { activities, setActivities } = useContext(ActivitiesContext);
	const { setOccurrences } = useContext(OccurrencesContext);
	return (
		<div className="students-container" id="students-container">
			<h2 className="students-container__header">Students list</h2>
			<div className="students" id="students">
				{students.map((student) => (
					<Student key={student.id}
						student={student}
						setStudents={setStudents}
						activities={activities}
						setActivities={setActivities}
						setOccurrences={setOccurrences} />
				))}
			</div>
		</div>
	)
}

function Student({ student }) {
	const client = useContext(DatabaseContext);
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
			if (Notification.permission === "granted") {
				new Notification("Activity already tracked", { body: `Activity ${activity.name} already tracked for ${student.name}` });
			}
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
			if (Notification.permission === "granted") {
				new Notification("Student deleted", { body: `Deleted ${student.name}` });
			}
		}
	};

	return (
		<div className="student" style={{ backgroundColor: student.config.color }}>
			<div className="student-header">
				<h2 className="student-name">{student.name}</h2>
				<button className="delete-button button" title="Delete Student" onClick={deleteStudent}>×</button>
			</div>
			<form className="form student-activity-form" onSubmit={trackActivity}>
				<div className="form-control">
					<label className="label" htmlFor="activity">New activity name</label>
					<input className="input-text" type="text" name="activity-name" list={datalistId} required />
				</div>
				<div className="form-control">
					<input className="input-submit button" type="submit" value="Track activity" />
				</div>
			</form>
			<div className="student-activities">
				<ActivitiesDatalist student={student} id={datalistId}></ActivitiesDatalist>
				<h3>Tracked activities</h3>
				{studentActivities.map((activity) => (
					<Activity
						key={activity.id}
						student={student}
						setStudents={setStudents}
						activity={activity}
						setOccurrences={setOccurrences}
					/>
				))}
			</div>
		</div>
	)
}

function Activity({ student, activity }) {
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
		if (Navigation.permission === "granted") {
			new Notification("Occurrence recorded", { body: `Recorded ${activity.name} occurrence for ${student.name}` });
		}
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
		if (Navigation.permission === "granted") {
			new Notification("Occurrences removed", { body: `Removed ${activity.name} occurrences for ${student.name}` });
		}
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
		if (Navigation.permission === "granted") {
			new Notification("Occurrence tracking removed", { body: `No longer tracking ${activity.name} occurrences for ${student.name}` });
		}
	};

	return (
		<div className="activity-buttons" key={activity.id}>
			<p className="activity-name">{activity.name}</p>
			<button className="button record-occurrence-button" onClick={recordOccurrence}>Record occurrence</button>
			<button className="button remove-occurrence-button" onClick={removeOccurrences}>Remove all occurrences</button>
			<button className="button untrack-activity-button" onClick={untrackActivity}>Stop tracking</button>
		</div>
	)
}

export default App
