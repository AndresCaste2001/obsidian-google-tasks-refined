import { App, FuzzySuggestModal } from "obsidian";
import type GoogleTasks from "../GoogleTasksPlugin";
import type { Task } from "../helper/types";

export class TaskSelectionModal extends FuzzySuggestModal<Task> {
	plugin: GoogleTasks;
	tasks: Task[];
	onSelect: (task: Task) => void;

	constructor(plugin: GoogleTasks, tasks: Task[], onSelect: (task: Task) => void) {
		super(plugin.app);
		this.plugin = plugin;
		this.tasks = tasks;
		this.onSelect = onSelect;
		this.setPlaceholder("Select a task to create a note from...");
	}

	getItems(): Task[] {
		return this.tasks;
	}

	getItemText(task: Task): string {
		let text = task.title;
		if (task.due) {
			const dueDate = window.moment.utc(task.due).local().format("YYYY-MM-DD");
			text += ` (${dueDate})`;
		}
		if (task.taskListName) {
			text += ` [${task.taskListName}]`;
		}
		return text;
	}

	onChooseItem(task: Task, evt: MouseEvent | KeyboardEvent): void {
		this.onSelect(task);
	}
}
