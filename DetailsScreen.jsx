import * as ImagePicker from "expo-image-picker";
import uuid from "uuid-random";
import React, { useState, useEffect } from "react";
import {
    Text,
    View,
    Image,
    Button,
    ScrollView,
    StyleSheet,
} from "react-native";
import { db } from "./utils";

function DetailsScreen({ route, navigation }) {
    const { itemId } = route.params;

    const [pictures, setPictures] = useState([]);

    useEffect(() => {
        db.transaction((tx) => {
            tx.executeSql(
                "select * from pictures where marker_id = ?",
                [itemId],
                (_, { rows: { _array } }) => setPictures(_array)
            );
        });
    }, []);

    //https://docs.expo.dev/tutorial/image-picker/
    let openImagePickerAsyncLibrary = async () => {
        let permissionResult =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Permission to access image library is required!");
            return;
        }
        let pickerResult = await ImagePicker.launchImageLibraryAsync();
        if (pickerResult.cancelled === true) {
            return;
        }
        addImageToMarker(pickerResult.uri);
    };

    let openImagePickerAsyncCamera = async () => {
        let permissionResult =
            await ImagePicker.requestCameraPermissionsAsync();

        if (permissionResult.granted === false) {
            alert("Permission to access camera is required!");
            return;
        }
        let pickerResult = await ImagePicker.launchCameraAsync();
        if (pickerResult.cancelled === true) {
            return;
        }
        addImageToMarker(pickerResult.uri);
    };

    //https://reactdevstation.github.io/2020/04/04/sqllite.html
    let addImageToMarker = async (uri) => {
        db.transaction((tx) => {
            tx.executeSql(
                "insert into pictures (marker_id, image_path) values (?,?);",
                [itemId, uri],
                () => console.log("Add image"),
                (_, e) => console.log(e)
            );
            tx.executeSql(
                "select * from pictures where marker_id = ?",
                [itemId],
                (_, { rows: { _array } }) => setPictures(_array)
            );
        });
    };

    return (
        <View
            style={{
                flex: 1,
                alignItems: "center",
            }}
        >
            <ScrollView
                style={{ width: "100%" }}
                contentContainerStyle={{
                    alignItems: "center",
                }}
            >
                <Text>Marker {itemId}</Text>

                <View
                    style={{
                        flex: 1,
                        flexDirection: "row",
                        justifyContent: "space-evenly",
                    }}
                >
                    <Button
                        title={"Add image \n from library"}
                        color="#2196F3"
                        onPress={() => openImagePickerAsyncLibrary()}
                    ></Button>
                    <Button
                        title={"Add image \n from camera"}
                        color="#2196F3"
                        onPress={() => openImagePickerAsyncCamera()}
                    ></Button>
                </View>

                <View>
                    {pictures.length > 0 ? (
                        pictures.map(({ id, marker_id, image_path }) => (
                            <Image
                                style={styles.thumbnail}
                                key={uuid()}
                                source={{ uri: image_path }}
                            />
                        ))
                    ) : (
                        <Text>No images</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    thumbnail: {
        width: 300,
        height: 300,
        resizeMode: "contain",
    },
});

export default DetailsScreen;
