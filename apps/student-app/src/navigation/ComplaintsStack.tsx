import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Chat from '../features/complaints/Chat';
import ComplaintDetails from '../features/complaints/ComplaintDetails';
import ComplaintsHome from '../features/complaints/ComplaintsHome';
import NewComplaint from '../features/complaints/NewComplaint';
import ReconnectComplaint from '../features/complaints/ReconnectComplaint';

export type ComplaintsStackParamList = {
  ComplaintsHome: undefined;
  NewComplaint: undefined;
  ReconnectComplaint: undefined;
  ComplaintDetails: { caseId: string };
  ComplaintChat: { caseId: string };
};

export type ComplaintsStackScreenProps<T extends keyof ComplaintsStackParamList> =
  NativeStackScreenProps<ComplaintsStackParamList, T>;

const Stack = createNativeStackNavigator<ComplaintsStackParamList>();
const queryClient = new QueryClient();

export default function ComplaintsStackNavigator() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack.Navigator>
        <Stack.Screen
          name="ComplaintsHome"
          component={ComplaintsHome}
          options={{ title: 'Complaints' }}
        />
        <Stack.Screen
          name="NewComplaint"
          component={NewComplaint}
          options={{ title: 'New complaint' }}
        />
        <Stack.Screen
          name="ReconnectComplaint"
          component={ReconnectComplaint}
          options={{ title: 'Reconnect case' }}
        />
        <Stack.Screen
          name="ComplaintDetails"
          component={ComplaintDetails}
          options={{ title: 'Complaint details' }}
        />
        <Stack.Screen
          name="ComplaintChat"
          component={Chat}
          options={{ title: 'Anonymous chat' }}
        />
      </Stack.Navigator>
    </QueryClientProvider>
  );
}
