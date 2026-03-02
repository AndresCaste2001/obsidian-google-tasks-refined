import { Notice, TFile, TFolder, normalizePath } from "obsidian";
import type GoogleTasks from "../GoogleTasksPlugin";
import type { Task } from "./types";

export interface CreateNoteResult {
	file: TFile | null;
	exists: boolean;
	suggestedPath: string;
}

export async function checkIfNoteExists(
	plugin: GoogleTasks,
	task: Task,
	folderPath: string = ""
): Promise<{ exists: boolean; existingFile: TFile | null; basePath: string; nextAvailablePath: string }> {
	const vault = plugin.app.vault;
	const sanitizedTitle = sanitizeFileName(task.title);
	
	const basePath = folderPath
		? normalizePath(`${folderPath}/${sanitizedTitle}.md`)
		: normalizePath(`${sanitizedTitle}.md`);
	
	const existingFile = vault.getAbstractFileByPath(basePath);
	
	if (!existingFile) {
		return { exists: false, existingFile: null, basePath, nextAvailablePath: basePath };
	}
	
	// Find next available number
	let counter = 1;
	let nextPath: string;
	
	do {
		nextPath = folderPath
			? normalizePath(`${folderPath}/${sanitizedTitle} (${counter}).md`)
			: normalizePath(`${sanitizedTitle} (${counter}).md`);
		counter++;
	} while (vault.getAbstractFileByPath(nextPath));
	
	return { 
		exists: true, 
		existingFile: existingFile as TFile, 
		basePath, 
		nextAvailablePath: nextPath 
	};
}

export function sanitizeFileName(title: string): string {
	return title
		.replace(/[\\/:*?"<>|]/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.substring(0, 100);
}

export async function createTaskNote(
	plugin: GoogleTasks,
	task: Task,
	folderPath: string = "",
	forcePath: string | null = null  // Allow forcing a specific path
): Promise<TFile | null> {
	const vault = plugin.app.vault;

	// Use forced path or generate from task title
	const fullPath = forcePath || (folderPath
		? normalizePath(`${folderPath}/${sanitizeFileName(task.title)}.md`)
		: normalizePath(`${sanitizeFileName(task.title)}.md`));

	// Generate the markdown content
	const content = generateTaskMarkdown(task);

	try {
		// Ensure the folder exists (and is actually a folder, not a file)
		if (folderPath) {
			const normalizedFolder = normalizePath(folderPath);
			const existingItem = vault.getAbstractFileByPath(normalizedFolder);
			
			if (existingItem) {
				if (!(existingItem instanceof TFolder)) {
					new Notice(`Cannot create folder "${folderPath}" - a file with that name already exists`);
					return null;
				}
			} else {
				await vault.createFolder(normalizedFolder);
			}
		}

		// Create the file
		const file = await vault.create(fullPath, content);
		new Notice(`Created note: ${file.name}`);
		return file;
	} catch (error) {
		console.error("Error creating task note:", error);
		new Notice(`Failed to create note: ${error.message}`);
		return null;
	}
}

/**
 * Generates markdown content from a Task object
 */
function generateTaskMarkdown(task: Task): string {
	const lines: string[] = [];

	// YAML frontmatter
	lines.push("---");
	if (task.taskListName) {
		lines.push(`task-list: "${task.taskListName}"`);
	}
	if (task.due) {
		lines.push(`due: ${window.moment.utc(task.due).local().format("YYYY-MM-DD")}`);
	}
	lines.push("tags:");
	lines.push("  - google-tasks");
	lines.push("---");
	lines.push("");

	// Title as H1
	lines.push(`# ${task.title}`);
	lines.push("");

	// Notes section
	if (task.notes) {
		lines.push("## Notes");
		lines.push("");
		lines.push(task.notes);
		lines.push("");
	}

	return lines.join("\n");
}
