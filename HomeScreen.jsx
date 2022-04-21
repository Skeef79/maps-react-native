import React, { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, Dimensions, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View } from "react-native";
import { MarkerContext, db } from "./utils";
import * as Notifications from "expo-notifications";
import haversineDistance from "haversine-distance";
import DialogInput from "react-native-dialog-input";

const startRegion = {
    latitude: 57.78825,
    longitude: 56.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
};

function HomeScreen({ navigation }) {
    const [userCoords, setUserCoords] = useState(null);
    const [showedNotifications, setshowedNotifications] = useState([]);

    useEffect(() => {
        Notifications.dismissAllNotificationsAsync();
        setshowedNotifications([]);
    }, [markerCoords]);

    useEffect(() => {
        if (!userCoords) return;
        if (markerCoords.length == 0) return;

        const markersToNotify = markerCoords.filter(
            (marker) =>
                getDistance(
                    marker.latitude,
                    marker.longitude,
                    userCoords.latitude,
                    userCoords.longitude
                ) < 800.0 && !showedNotifications.find((m) => m === marker.id)
        );
        markersToNotify.forEach((marker) => {
            setshowedNotifications((ntfids) => [...ntfids, marker.id]);
            schedulePushNotification(userCoords, marker);
        });
    }, [userCoords, markerCoords]);

    const [markerCoords, setMarkerCoords] = useContext(MarkerContext);
    useEffect(() => {
        db.transaction((tx) => {
            tx.executeSql(
                "select * from markers",
                [],
                (_, { rows: { _array } }) => setMarkerCoords(_array)
            );
        });
    }, []);

    const addMarker = (name, coords) => {
        //const coords = e.nativeEvent.coordinate;

        db.transaction((tx) => {
            tx.executeSql(
                "insert into markers (name, latitude, longitude) values(?,?,?)",
                [name, coords.latitude, coords.longitude]
            );
            tx.executeSql(
                "select * from markers",
                [],
                (_, { rows: { _array } }) => {
                    console.log("Marker added");
                    setMarkerCoords(_array);
                },
                (_, e) => {
                    console.log(e);
                }
            );
        });
    };

    const markerPress = (e, itemId, name) => {
        e.stopPropagation();
        navigation.navigate("Marker", { itemId: itemId, name: name });
    };

    let markers = markerCoords.map(({ id, name, latitude, longitude }) => (
        <Marker
            key={id}
            coordinate={{ latitude, longitude }}
            title={`${name}`}
            onPress={(e) => markerPress(e, id, name)}
        />
    ));

    //https://github.com/react-native-maps/react-native-maps

    [showDialog, setShowDialog] = useState(false);
    [newCoords, setNewCoords] = useState(null);

    const addMarkerDialog = (inputText) => {
        let markerName = "Marker";
        if (inputText) {
            markerName = inputText;
        }
        console.log(markerName);
        addMarker(markerName, newCoords);
        setShowDialog(false);
    };

    return (
        <View style={styles.container}>
            <DialogInput
                isDialogVisible={showDialog}
                title={"Marker title"}
                message={"Input marker title"}
                submitInput={(inputText) => {
                    addMarkerDialog(inputText);
                }}
                closeDialog={() => {
                    setShowDialog(false);
                }}
            ></DialogInput>
            <MapView
                style={{ alignSelf: "stretch", height: "100%" }}
                provider={PROVIDER_GOOGLE}
                initialRegion={startRegion}
                onPress={(e) => {
                    setNewCoords(e.nativeEvent.coordinate);
                    setShowDialog(true);
                    //addMarker(e);
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
                onUserLocationChange={(e) => {
                    const coords = e.nativeEvent.coordinate;
                    setUserCoords({
                        latitude: coords.latitude,
                        longitude: coords.longitude,
                    });
                }}
            >
                {markers}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    map: {
        width: Dimensions.get("window").width,
        height: Dimensions.get("window").height,
    },
    thumbnail: {
        width: 300,
        height: 300,
        resizeMode: "contain",
    },
});

//return distance in meters
function getDistance(lat1, lng1, lat2, lng2) {
    const point1 = { lat: lat1, lng: lng1 };
    const point2 = { lat: lat2, lng: lng2 };
    const distance = haversineDistance(point1, point2);
    //console.log(`Distance is ${distance}`);

    return distance;
}

//https://docs.expo.dev/versions/latest/sdk/notifications/
async function schedulePushNotification(userCoords, marker) {
    const identifier = await Notifications.scheduleNotificationAsync({
        content: {
            title: `Marker ${marker.name} is near`,
            body: `Marker ${marker.name} is ${Math.ceil(
                getDistance(
                    userCoords.latitude,
                    userCoords.longitude,
                    marker.latitude,
                    marker.longitude
                )
            )} meters away`,
            data: { data: "" },
        },
        trigger: null,
    });

    console.log(`Notification: ${marker.id} | identifier: ${identifier}`);
}

export default HomeScreen;
