import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTicketCache } from './model';
export const ticketCache = createTicketCache(AsyncStorage);
