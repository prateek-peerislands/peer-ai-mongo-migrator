import fs from 'fs';
import path from 'path';

export interface MongoDBSchema {
  collections: MongoDBCollection[];
  embeddedDocuments: EmbeddedDocument[];
  indexes: MongoDBIndex[];
  relationships: MongoDBRelationship[];
  summary: {
    totalCollections: number;
    totalDocuments: number;
    totalIndexes: number;
  };
}

export interface MongoDBCollection {
  name: string;
  documents: MongoDBDocument[];
  indexes: string[];
  estimatedSize?: string;
}

export interface MongoDBDocument {
  name: string;
  fields: MongoDBField[];
  description?: string;
}

export interface MongoDBField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  embedded?: boolean;
}

export interface EmbeddedDocument {
  parentCollection: string;
  documentName: string;
  fields: MongoDBField[];
  description?: string;
}

export interface MongoDBIndex {
  collection: string;
  fields: string[];
  type: string;
  description?: string;
}

export interface MongoDBRelationship {
  from: string;
  to: string;
  type: string;
  description?: string;
}

export class MongoDBSchemaFileParser {
  /**
   * Find the latest MongoDB schema markdown file
   */
  findLatestMongoDBSchemaFile(directory: string = process.cwd()): string | null {
    try {
      const files = fs.readdirSync(directory);
      const mongodbFiles = files
        .filter(file => (file.startsWith('mongodb-schema-') || file.startsWith('proposed-mongodb-schema-')) && file.endsWith('.md'))
        .sort()
        .reverse();
      
      return mongodbFiles.length > 0 ? mongodbFiles[0] : null;
    } catch (error) {
      console.error('Error finding MongoDB schema file:', error);
      return null;
    }
  }

  /**
   * Parse a MongoDB schema markdown file
   */
  async parseSchemaFile(filePath: string): Promise<MongoDBSchema> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.parseMongoDBSchemaContent(content);
    } catch (error) {
      console.error('Error parsing MongoDB schema file:', error);
      throw new Error(`Failed to parse MongoDB schema file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse MongoDB schema information from markdown content
   */
  private parseMongoDBSchemaContent(content: string): MongoDBSchema {
    const collections = this.extractCollections(content);
    const embeddedDocuments = this.extractEmbeddedDocuments(content);
    const indexes = this.extractIndexes(content);
    const relationships = this.extractRelationships(content);
    const summary = this.extractSummary(content);

    // Parsed collections from MongoDB schema

    return {
      collections,
      embeddedDocuments,
      indexes,
      relationships,
      summary
    };
  }

  /**
   * Extract collections from markdown content
   */
  private extractCollections(content: string): MongoDBCollection[] {
    const collections: MongoDBCollection[] = [];
    const collectionRegex = /## Collection: (.+?)(?=##|$)/gs;
    let match;

    while ((match = collectionRegex.exec(content)) !== null) {
      const collectionSection = match[1];
      const collectionName = match[1].split('\n')[0].trim();
      
      const documents = this.extractDocumentsFromCollection(collectionSection);
      const indexes = this.extractIndexesFromCollection(collectionSection);
      const estimatedSize = this.extractEstimatedSize(collectionSection);

      collections.push({
        name: collectionName,
        documents,
        indexes,
        estimatedSize
      });
    }

    return collections;
  }

  /**
   * Extract documents from a collection section
   */
  private extractDocumentsFromCollection(collectionSection: string): MongoDBDocument[] {
    const documents: MongoDBDocument[] = [];
    const documentRegex = /### Document: (.+?)(?=###|$)/gs;
    let match;

    while ((match = documentRegex.exec(collectionSection)) !== null) {
      const documentSection = match[1];
      const documentName = match[1].split('\n')[0].trim();
      
      const fields = this.extractFieldsFromDocument(documentSection);
      const description = this.extractDescription(documentSection);

      documents.push({
        name: documentName,
        fields,
        description
      });
    }

    return documents;
  }

  /**
   * Extract fields from a document section
   */
  private extractFieldsFromDocument(documentSection: string): MongoDBField[] {
    const fields: MongoDBField[] = [];
    const fieldRegex = /\| (.+?) \| (.+?) \| (.+?) \| (.+?) \|/g;
    let match;

    while ((match = fieldRegex.exec(documentSection)) !== null) {
      const [, name, type, required, description] = match;
      
      fields.push({
        name: name.trim(),
        type: type.trim(),
        required: required.trim().toLowerCase() === 'yes',
        description: description.trim() || undefined,
        embedded: type.includes('embedded') || type.includes('array')
      });
    }

    return fields;
  }

  /**
   * Extract embedded documents from markdown content
   */
  private extractEmbeddedDocuments(content: string): EmbeddedDocument[] {
    const embeddedDocs: EmbeddedDocument[] = [];
    const embeddedRegex = /## Embedded Document: (.+?)(?=##|$)/gs;
    let match;

    while ((match = embeddedRegex.exec(content)) !== null) {
      const embeddedSection = match[1];
      const lines = embeddedSection.split('\n');
      const documentName = lines[0].trim();
      
      // Extract parent collection from the section
      const parentMatch = embeddedSection.match(/Parent Collection: (.+)/);
      const parentCollection = parentMatch ? parentMatch[1].trim() : 'Unknown';
      
      const fields = this.extractFieldsFromDocument(embeddedSection);
      const description = this.extractDescription(embeddedSection);

      embeddedDocs.push({
        parentCollection,
        documentName,
        fields,
        description
      });
    }

    return embeddedDocs;
  }

  /**
   * Extract indexes from markdown content
   */
  private extractIndexes(content: string): MongoDBIndex[] {
    const indexes: MongoDBIndex[] = [];
    const indexRegex = /### Index: (.+?)(?=###|$)/gs;
    let match;

    while ((match = indexRegex.exec(content)) !== null) {
      const indexSection = match[1];
      const lines = indexSection.split('\n');
      const indexName = lines[0].trim();
      
      // Extract collection from the section
      const collectionMatch = indexSection.match(/Collection: (.+)/);
      const collection = collectionMatch ? collectionMatch[1].trim() : 'Unknown';
      
      // Extract fields
      const fieldsMatch = indexSection.match(/Fields: (.+)/);
      const fields = fieldsMatch ? fieldsMatch[1].split(',').map(f => f.trim()) : [];
      
      // Extract type
      const typeMatch = indexSection.match(/Type: (.+)/);
      const type = typeMatch ? typeMatch[1].trim() : 'Unknown';
      
      const description = this.extractDescription(indexSection);

      indexes.push({
        collection,
        fields,
        type,
        description
      });
    }

    return indexes;
  }

  /**
   * Extract relationships from markdown content
   */
  private extractRelationships(content: string): MongoDBRelationship[] {
    const relationships: MongoDBRelationship[] = [];
    const relationshipRegex = /### Relationship: (.+?)(?=###|$)/gs;
    let match;

    while ((match = relationshipRegex.exec(content)) !== null) {
      const relationshipSection = match[1];
      const lines = relationshipSection.split('\n');
      const relationshipName = lines[0].trim();
      
      // Extract from and to collections
      const fromMatch = relationshipSection.match(/From: (.+)/);
      const toMatch = relationshipSection.match(/To: (.+)/);
      const typeMatch = relationshipSection.match(/Type: (.+)/);
      
      const from = fromMatch ? fromMatch[1].trim() : 'Unknown';
      const to = toMatch ? toMatch[1].trim() : 'Unknown';
      const type = typeMatch ? typeMatch[1].trim() : 'Unknown';
      
      const description = this.extractDescription(relationshipSection);

      relationships.push({
        from,
        to,
        type,
        description
      });
    }

    return relationships;
  }

  /**
   * Extract summary information from markdown content
   */
  private extractSummary(content: string): MongoDBSchema['summary'] {
    const summaryMatch = content.match(/## Summary[\s\S]*?Total Collections: (\d+)[\s\S]*?Total Documents: (\d+)[\s\S]*?Total Indexes: (\d+)/);
    
    if (summaryMatch) {
      return {
        totalCollections: parseInt(summaryMatch[1]),
        totalDocuments: parseInt(summaryMatch[2]),
        totalIndexes: parseInt(summaryMatch[3])
      };
    }

    // Fallback: count from parsed data
    const collections = this.extractCollections(content);
    const totalDocuments = collections.reduce((sum, col) => sum + col.documents.length, 0);
    const indexes = this.extractIndexes(content);

    return {
      totalCollections: collections.length,
      totalDocuments,
      totalIndexes: indexes.length
    };
  }

  /**
   * Extract indexes from a collection section
   */
  private extractIndexesFromCollection(collectionSection: string): string[] {
    const indexes: string[] = [];
    const indexRegex = /- (.+?) \(/g;
    let match;

    while ((match = indexRegex.exec(collectionSection)) !== null) {
      indexes.push(match[1].trim());
    }

    return indexes;
  }

  /**
   * Extract estimated size from a collection section
   */
  private extractEstimatedSize(collectionSection: string): string | undefined {
    const sizeMatch = collectionSection.match(/Estimated Size: (.+)/);
    return sizeMatch ? sizeMatch[1].trim() : undefined;
  }

  /**
   * Extract description from a section
   */
  private extractDescription(section: string): string | undefined {
    const descMatch = section.match(/Description: (.+?)(?:\n|$)/);
    return descMatch ? descMatch[1].trim() : undefined;
  }
}
