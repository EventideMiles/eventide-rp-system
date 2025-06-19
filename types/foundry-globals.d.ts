declare global {
  const foundry: any;
  const game: any;
  const ui: any;
  const canvas: any;
  const CONFIG: any;
  const CONST: any;
  const Hooks: any;
  const loadTemplates: any;
  const renderTemplate: any;
  const fromUuid: any;
  const fromUuidSync: any;
  const getDocumentClass: any;
  const mergeObject: any;
  const expandObject: any;
  const duplicate: any;
  const isEmpty: any;
  const isObjectEmpty: any;
  const flattenObject: any;
  const getProperty: any;
  const setProperty: any;
  const hasProperty: any;
  const deepClone: any;
  const randomID: any;
  const Roll: any;
  const ChatMessage: any;
  const Actor: any;
  const Item: any;
  const Scene: any;
  const User: any;
  const Folder: any;
  const Macro: any;
  const Playlist: any;
  const JournalEntry: any;
  const RollTable: any;
  const Card: any;
  const Cards: any;
  const Setting: any;
  const ActiveEffect: any;
  const Combat: any;
  const Combatant: any;
  const Token: any;
  const TokenDocument: any;
  const ActorSheet: any;
  const ItemSheet: any;
  const Application: any;
  const FormApplication: any;
  const Dialog: any;
  const FilePicker: any;
  const DocumentSheet: any;
  const Handlebars: any;
  
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export {};