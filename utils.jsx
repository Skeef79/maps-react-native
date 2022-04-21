import { createContext } from "react";
import * as SQLite from "expo-sqlite";

export const db = SQLite.openDatabase("markers.db");

export const MarkerContext = createContext();
