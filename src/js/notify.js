export const notify = (message, body) => {
	if (!("Notification" in window)) {
		return;
	}
	if (Notification.permission === "granted") {
		new Notification(message, { body });
	}
	else if (Notification.permission === "denied") {
		Notification.requestPermission().then((permission) => {
			if (permission === "granted") {
				new Notification(message, { body });
			}
		});
	}
};
