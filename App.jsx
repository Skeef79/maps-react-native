import React, { useState, useEffect } from "react";
import { Button } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./HomeScreen";
import DetailsScreen from "./DetailsScreen";
import { db } from "./utils";
import { MarkerContext } from "./utils";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";

const Stack = createNativeStackNavigator();

function App() {
    const [markerCoords, setMarkerCoords] = useState([]);

    useEffect(() => {
        db.transaction((tx) => {
            tx.executeSql(
                "create table if not exists markers (id integer primary key autoincrement, latitude real, longitude real); ",
                [],
                null,
                (_, e) => console.log(e)
            );
            tx.executeSql(
                "create table if not exists pictures (id integer primary key autoincrement, marker_id integer, image_path text);",
                [],
                null,
                (_, e) => console.log(e)
            );
        });

        //https://docs.expo.dev/versions/latest/sdk/location/
        requestLocationPermissionsAsync = async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status != "granted") {
                alert("Permission to access location is required!");
                return;
            }
        };

        requestLocationPermissionsAsync();

        // Setting up Notification
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: false,
                shouldSetBadge: true,
            }),
        });

        registerForPushNotificationsAsync();

        Notifications.dismissAllNotificationsAsync();
    }, []);

    const removeMarker = (markerId) => {
        db.transaction((tx) => {
            tx.executeSql("delete from markers where id = ?;", [markerId]);
            tx.executeSql(
                "select * from markers",
                [],
                (_, { rows: { _array } }) => setMarkerCoords(_array)
            );
        });
    };

    return (
        <MarkerContext.Provider value={[markerCoords, setMarkerCoords]}>
            <NavigationContainer>
                <Stack.Navigator initialRouteName="Home">
                    <Stack.Screen name="Home" component={HomeScreen} />
                    <Stack.Screen
                        name="Marker"
                        component={DetailsScreen}
                        options={({ route, navigation }) => ({
                            headerRight: () => (
                                <Button
                                    onPress={() => {
                                        removeMarker(route.params.itemId);
                                        navigation.goBack();
                                    }}
                                    title="Delete"
                                    color="#f7364a"
                                />
                            ),
                        })}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </MarkerContext.Provider>
    );
}

//https://docs.expo.dev/push-notifications/overview/
async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
        const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== "granted") {
            alert("Failed to get push token for push notification!");
            return;
        }
        token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log(token);
    } else {
        alert("Must use physical device for Push Notifications");
    }

    if (Platform.OS === "android") {
        Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
        });
    }

    return token;
}

export default App;
