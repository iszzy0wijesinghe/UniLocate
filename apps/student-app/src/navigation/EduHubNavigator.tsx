/** @format */

import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EduHubHome from "../features/eduhub/screens/EduHubHome";
import NotesHome from "../features/eduhub/screens/NotesHome";
import AddNote from "../features/eduhub/screens/AddNote";
import NoteDetails from "../features/eduhub/screens/NoteDetails";
import AskAI from "../features/eduhub/screens/AskAI";
import ExamMode from "../features/eduhub/screens/ExamMode";
import AddExamEntry from "../features/eduhub/screens/AddExamEntry";
import FlashcardsHome from "../features/eduhub/screens/FlashcardsHome";
import FlashcardLibrary from "../features/eduhub/screens/FlashcardLibrary";
import FlashcardViewer from "../features/eduhub/screens/FlashcardViewer";

export type EduHubStackParamList = {
  EduHubHome: undefined;
  NotesHome: undefined;
  AddNote: undefined;
  NoteDetails: { noteId: string };
  AskAI: undefined;
  FlashcardsHome:
    | {
        preselectedModuleCode?: string;
        preselectedModuleName?: string;
      }
    | undefined;

  FlashcardLibrary: undefined;

  FlashcardViewer: {
    setId: string;
    moduleCode: string;
    moduleName: string;
  };
  ExamMode: undefined;
  AddExamEntry: undefined;
};

const Stack = createNativeStackNavigator<EduHubStackParamList>();

export default function EduHubNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="EduHubHome"
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EduHubHome" component={EduHubHome} />
      <Stack.Screen name="NotesHome" component={NotesHome} />
      <Stack.Screen name="AddNote" component={AddNote} />
      <Stack.Screen name="NoteDetails" component={NoteDetails} />
      <Stack.Screen name="AskAI" component={AskAI} />
      <Stack.Screen name="FlashcardsHome" component={FlashcardsHome} />
      <Stack.Screen name="FlashcardLibrary" component={FlashcardLibrary} />
      <Stack.Screen name="FlashcardViewer" component={FlashcardViewer} />
      <Stack.Screen name="ExamMode" component={ExamMode} />
      <Stack.Screen name="AddExamEntry" component={AddExamEntry} />
    </Stack.Navigator>
  );
}
