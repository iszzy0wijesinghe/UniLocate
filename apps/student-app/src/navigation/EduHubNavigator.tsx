import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import EduHubHome from "../features/eduhub/screens/EduHubHome";
import NotesHome from "../features/eduhub/screens/NotesHome";
import AddNote from "../features/eduhub/screens/AddNote";
import NoteDetails from "../features/eduhub/screens/NoteDetails";
import AskAI from "../features/eduhub/screens/AskAI";
import Flashcards from "../features/eduhub/screens/Flashcards";
import ExamMode from "../features/eduhub/screens/ExamMode";
import AddExamEntry  from "../features/eduhub/screens/AddExamEntry";

export type EduHubStackParamList = {
  EduHubHome: undefined;
  NotesHome: undefined;
  AddNote: undefined;
  NoteDetails: { noteId: string };
  AskAI: undefined;
  Flashcards: undefined;
  ExamMode: undefined;
  AddExamEntry: undefined;
};

const Stack = createNativeStackNavigator<EduHubStackParamList>();

export default function EduHubNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="EduHubHome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="EduHubHome" component={EduHubHome} />
      <Stack.Screen name="NotesHome" component={NotesHome} />
      <Stack.Screen name="AddNote" component={AddNote} />
      <Stack.Screen name="NoteDetails" component={NoteDetails} />
      <Stack.Screen name="AskAI" component={AskAI} />
      <Stack.Screen name="Flashcards" component={Flashcards} />
      <Stack.Screen name="ExamMode" component={ExamMode} />
      <Stack.Screen name="AddExamEntry" component={AddExamEntry} />
    </Stack.Navigator>
  );
}