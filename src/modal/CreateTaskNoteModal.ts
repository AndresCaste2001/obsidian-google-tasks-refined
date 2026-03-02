import { Modal, Setting, Notice } from "obsidian";
import type GoogleTasks from "../GoogleTasksPlugin";
import type { Task } from "../helper/types";
import { createTaskNote, checkIfNoteExists } from "../helper/CreateTaskNote";

const DEFAULT_FOLDER = "Tasks";

export class CreateTaskNoteModal extends Modal {
    plugin: GoogleTasks;
    task: Task;
    folderPath: string = DEFAULT_FOLDER;
    openAfterCreate: boolean = true;

    constructor(plugin: GoogleTasks, task: Task) {
        super(plugin.app);
        this.plugin = plugin;
        this.task = task;
    }

    async onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h1", { text: "Create Note from Task" });

        // Show task preview
        contentEl.createEl("h3", { text: this.task.title });
        
        if (this.task.notes) {
            contentEl.createEl("p", { 
                text: this.task.notes,
                cls: "task-note-preview" 
            });
        }

        // Folder path setting
        new Setting(contentEl)
            .setName("Folder")
            .setDesc(`Leave empty for default "/${DEFAULT_FOLDER}" folder`)
            .addText((text) => {
                text.setPlaceholder(DEFAULT_FOLDER);
                text.setValue(DEFAULT_FOLDER);
                text.onChange((value) => {
                    // If empty, use default
                    this.folderPath = value.trim() || DEFAULT_FOLDER;
                });
            });

        // Open after create setting
        new Setting(contentEl)
            .setName("Open note after creation")
            .addToggle((toggle) => {
                toggle.setValue(true);
                toggle.onChange((value) => {
                    this.openAfterCreate = value;
                });
            });

        // Create button
        new Setting(contentEl)
            .addButton((button) => {
                button
                    .setButtonText("Create Note")
                    .setCta()
                    .onClick(async () => {
                        await this.handleCreateNote();
                    });
            });
    }

    async handleCreateNote() {
        // Check if file already exists
        const check = await checkIfNoteExists(this.plugin, this.task, this.folderPath);
        
        if (check.exists) {
            // Show confirmation modal
            new DuplicateFileModal(
                this.plugin,
                this.task,
                this.folderPath,
                check.nextAvailablePath,
                this.openAfterCreate,
                () => this.close()
            ).open();
        } else {
            // Create directly
            const file = await createTaskNote(this.plugin, this.task, this.folderPath);
            
            if (file && this.openAfterCreate) {
                await this.plugin.app.workspace.getLeaf().openFile(file);
            }
            
            this.close();
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Modal shown when a file with the same name already exists
 */
class DuplicateFileModal extends Modal {
    plugin: GoogleTasks;
    task: Task;
    folderPath: string;
    nextAvailablePath: string;
    openAfterCreate: boolean;
    onComplete: () => void;

    constructor(
        plugin: GoogleTasks,
        task: Task,
        folderPath: string,
        nextAvailablePath: string,
        openAfterCreate: boolean,
        onComplete: () => void
    ) {
        super(plugin.app);
        this.plugin = plugin;
        this.task = task;
        this.folderPath = folderPath;
        this.nextAvailablePath = nextAvailablePath;
        this.openAfterCreate = openAfterCreate;
        this.onComplete = onComplete;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.createEl("h2", { text: "File Already Exists" });
        
        contentEl.createEl("p", { 
            text: `A note with this name already exists in the folder.` 
        });
        
        contentEl.createEl("p", { 
            text: `Would you like to create it as:`,
            cls: "task-note-preview"
        });

        // Show the suggested new name
        const fileName = this.nextAvailablePath.split("/").pop();
        contentEl.createEl("p", { 
            text: `"${fileName}"`,
            cls: "duplicate-file-suggestion"
        });

        const buttonContainer = contentEl.createDiv({ cls: "duplicate-file-buttons" });

        // Cancel button
        new Setting(buttonContainer)
            .addButton((button) => {
                button
                    .setButtonText("Cancel")
                    .onClick(() => {
                        this.close();
                    });
            });

        // Create with new name button
        new Setting(buttonContainer)
            .addButton((button) => {
                button
                    .setButtonText("Create with New Name")
                    .setCta()
                    .onClick(async () => {
                        const file = await createTaskNote(
                            this.plugin,
                            this.task,
                            this.folderPath,
                            this.nextAvailablePath
                        );
                        
                        if (file && this.openAfterCreate) {
                            await this.plugin.app.workspace.getLeaf().openFile(file);
                        }
                        
                        this.close();
                        this.onComplete();
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
