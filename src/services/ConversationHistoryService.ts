import * as fs from 'fs';
import * as path from 'path';
import { DualLocationFileWriter } from '../utils/DualLocationFileWriter.js';

export interface ConversationMessage {
  timestamp: Date;
  type: 'USER' | 'AGENT';
  content: string;
}

export class ConversationHistoryService {
  private static instance: ConversationHistoryService;
  private messages: ConversationMessage[] = [];
  private readonly maxMessages = 100;
  private filePath: string | null = null;
  private isRecording = false;
  private userMessageCount = 0;
  private currentFileNumber = 1;
  private sessionId: string | null = null;

  private constructor() {}

  public static getInstance(): ConversationHistoryService {
    if (!ConversationHistoryService.instance) {
      ConversationHistoryService.instance = new ConversationHistoryService();
    }
    return ConversationHistoryService.instance;
  }

  public startRecording(): void {
    this.isRecording = true;
    this.messages = [];
    this.userMessageCount = 0;
    this.currentFileNumber = 1;
    this.sessionId = this.generateSessionId();
    this.filePath = this.generateFilePath();
    this.logMessage('AGENT', 'Conversation history recording started');
  }

  public stopRecording(): void {
    if (this.isRecording && this.filePath) {
      this.logMessage('AGENT', 'Conversation history recording stopped');
      this.saveToFile();
      this.isRecording = false;
    }
  }

  public addUserMessage(content: string): void {
    if (this.isRecording) {
      this.userMessageCount++;
      
      // Check if we need to create a new file (every 5 user messages)
      if (this.userMessageCount > 1 && (this.userMessageCount - 1) % 5 === 0) {
        this.createNewFile();
      }
      
      this.logMessage('USER', content);
    }
  }

  public addAgentMessage(content: string): void {
    if (this.isRecording) {
      this.logMessage('AGENT', content);
    }
  }

  public finalizeAgentResponse(): void {
    // No-op for compatibility
  }

  private logMessage(type: 'USER' | 'AGENT', content: string): void {
    const message: ConversationMessage = {
      timestamp: new Date(),
      type,
      content
    };

    this.messages.push(message);

    // Keep only last 100 messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }

    // Save to file immediately
    if (this.filePath) {
      this.saveToFile();
    }
  }

  private generateSessionId(): string {
    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
    const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
    return `${timeStr}_${dateStr}`;
  }

  private generateFilePath(): string {
    if (!this.sessionId) {
      this.sessionId = this.generateSessionId();
    }
    
    let filename;
    if (this.currentFileNumber === 1) {
      filename = `conversation_history_${this.sessionId}.txt`;
    } else {
      filename = `conversation_history_${this.sessionId}_part_${this.currentFileNumber}.txt`;
    }
    
    return path.join(process.cwd(), filename);
  }

  private createNewFile(): void {
    // Add continuation message to current file before creating new one
    if (this.filePath) {
      this.logMessage('AGENT', `The next set of conversations are in: conversation_history_${this.sessionId}_part_${this.currentFileNumber + 1}.txt`);
      this.saveToFile();
    }
    
    // Clear messages for new file (only new messages in each file)
    this.messages = [];
    
    // Increment file number and create new file path
    this.currentFileNumber++;
    this.filePath = this.generateFilePath();
    
    // Add start message to new file
    this.logMessage('AGENT', `Conversation history part ${this.currentFileNumber} started`);
  }

  private saveToFile(): void {
    if (!this.filePath) return;

    try {
      const content = this.messages
        .map(msg => {
          const timeStr = msg.timestamp.toTimeString().slice(0, 8);
          const dateStr = msg.timestamp.toLocaleDateString('en-GB');
          return `[${timeStr} ${dateStr}] ${msg.type}: ${msg.content}`;
        })
        .join('\n');

      // Extract filename from filePath for dual location writing
      const filename = path.basename(this.filePath);
      
      // Write to both central location and project directory
      const { centralPath, projectPath } = DualLocationFileWriter.writeToBothLocations(filename, content);
      
      // Update filePath to point to project location for consistency
      this.filePath = projectPath;
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  public getLastMessages(count: number = this.maxMessages): ConversationMessage[] {
    return this.messages.slice(-count);
  }

  public getContextForLLM(): string {
    return this.messages
      .map(msg => `${msg.type}: ${msg.content}`)
      .join('\n');
  }

  public isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  public getCurrentFilePath(): string | null {
    return this.filePath;
  }

  public getUserMessageCount(): number {
    return this.userMessageCount;
  }

  public getCurrentFileNumber(): number {
    return this.currentFileNumber;
  }
}
