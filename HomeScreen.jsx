import React, { useContext, useEffect, useRef, useState } from "react";
import { StyleSheet, Dimensions, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { View } from "react-native";
import { MarkerContext, db } from "./utils";
import * as Notifications from "expo-notifications";
import haversineDistance from "haversine-distance";

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

    const addMarker = (e) => {
        const coords = e.nativeEvent.coordinate;
        db.transaction((tx) => {
            tx.executeSql(
                "insert into markers (latitude, longitude) values(?,?)",
                [coords.latitude, coords.longitude]
            );
            tx.executeSql(
                "select * from markers",
                [],
                (_, { rows: { _array } }) => {
                    console.log("Add");
                    setMarkerCoords(_array);
                },
                (_, e) => {
                    console.log(e);
                }
            );
        });
    };

    const markerPress = (e, itemId) => {
        e.stopPropagation();
        navigation.navigate("Marker", { itemId: itemId });
    };

    let markers = markerCoords.map(({ id, latitude, longitude }) => (
        <Marker
            key={id}
            coordinate={{ latitude, longitude }}
            title={`Marker ${id}`}
            onPress={(e) => markerPress(e, id)}
        />
    ));

    //https://github.com/react-native-maps/react-native-maps
    return (
        <View style={styles.container}>
            <MapView
                style={{ alignSelf: "stretch", height: "100%" }}
                provider={PROVIDER_GOOGLE}
                initialRegion={startRegion}
                onPress={addMarker}
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
            title: `Marker ${marker.id} is near`,
            body: `Marker ${marker.id} is ${Math.ceil(
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
