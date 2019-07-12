import React, { Component } from 'react';
import { Platform, ActivityIndicator, Alert, StyleSheet, Text, View, AsyncStorage, TextInput, ScrollView } from 'react-native';
import { Container, Content, Footer, FooterTab, Button, H3 } from 'native-base';
import BackgroundGeolocation from "react-native-background-geolocation";

export default class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            isLoading: false,
            permissionStatus: null,
            isStart: false,
            path: null,
            calculatedDistance: null
        }
    }

    componentWillMount() {
        console.log('componentWillMount');
        // This handler fires whenever bgGeo receives a location update.
        BackgroundGeolocation.onLocation(this.watchPosition, this.onError);
    }


    // // You must remove listeners when your component unmounts
    componentWillUnmount() {
        BackgroundGeolocation.removeListeners();
    }

    getCurrentTime = () => {
        let date = new Date();
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        var ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${hours > 9 ? hours : '0' + hours}:${minutes > 9 ? minutes : '0' + minutes}:${seconds > 9 ? seconds : '0' + seconds} ${ampm}`
    }

    start = () => {
        this.setState({
            isLoading: true,
        });
        BackgroundGeolocation.ready({
            reset: true,
            desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
            distanceFilter: 1,
            stopTimeout: 10,
            debug: false,
            logLevel: BackgroundGeolocation.LOG_LEVEL_INFO,
            stopOnTerminate: false,
            startOnBoot: true,
            url: 'http://yourserver.com/locations',
            batchSync: false,
            autoSync: true,
            headers: {
                "X-FOO": "bar"
            },
            params: {
                "auth_token": "maybe_your_server_authenticates_via_token_YES?"
            }
        }, (state) => {
            console.log("- BackgroundGeolocation is configured and ready: ", state.enabled);
            if (!state.enabled) {
                AsyncStorage.removeItem('path').then(() => {
                    BackgroundGeolocation.start(() => {
                        console.log("- Start success");
                    });
                    this.setState({
                        isStart: true,
                        path: null,
                        calculatedDistance: null,
                        isLoading: false
                    });
                });
            }
            else {
                AsyncStorage.removeItem('path').then(() => {
                    BackgroundGeolocation.start(function () {
                        console.log("- Start success");
                    });
                    this.setState({
                        isStart: true,
                        path: null,
                        calculatedDistance: null,
                        isLoading: false
                    });
                });
            }
        });
    }

    watchPosition = async (location) => {
        console.log('[location] ', location);
        var path = JSON.parse(await AsyncStorage.getItem('path'));
        if (path) {
            path.push({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                time: this.getCurrentTime(),
            });
            await AsyncStorage.setItem('path', JSON.stringify(path));
            console.log('Storage Status', path);
        }
        else {
            let temp_path = [];
            temp_path.push({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                time: this.getCurrentTime(),
            });
            await AsyncStorage.setItem('path', JSON.stringify(temp_path));
            console.log('Storage Status', temp_path);
        }
    }

    stop = async () => {
        console.log('Stopping location tracking');
        var path = JSON.parse(await AsyncStorage.getItem('path'));
        if (path === null) {
            BackgroundGeolocation.stop(() => {
                console.log('You Path', path);
                this.setState({
                    isStart: false,
                    path: path,
                    calculatedDistance: null
                });
                Alert.alert('Cannot calculate distance', 'you stopped too quickly');
            });
        }
        else if (path.length > 1) {
            BackgroundGeolocation.stop(() => {
                console.log('Your path', path);
                this.setState({
                    isStart: false,
                    path: path,
                    calculatedDistance: this.getDistance(path)
                });
            });
        }
        else {
            console.log('You Path', path);
            this.setState({
                isStart: false,
                path: path,
                calculatedDistance: null
            });
            Alert.alert('Cannot calculate distance', 'you stopped too quickly');
        }
    }

    onError(error) {
        console.warn('[location] ERROR -', error);
    }

    getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        var R = 6371; // Radius of the earth in km
        var dLat = this.deg2rad(lat2 - lat1);
        var dLon = this.deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    }

    getSum = (total, sum) => {
        return total + sum;
    }

    getDistance = (path) => {
        var listOfDistance = [];
        for (let i = 0; i < path.length; i++) {
            if (i === path.length - 1) {
                break;
            }
            else {
                let distance = this.getDistanceFromLatLonInKm(path[i].latitude, path[i].longitude, path[i + 1].latitude, path[i + 1].longitude);
                listOfDistance.push(distance);
            }
        }
        return listOfDistance.reduce(this.getSum);;
    }

    render() {

        if (!this.state.isLoading) {
            return (
                <Container style={styles.container}>
                    <Content padder key={11}>
                        <View>
                            <H3 style={{ marginTop: 15 }}>Calculated distance</H3>
                            {
                                this.state.calculatedDistance !== null ?
                                    <Text>{Math.round(this.state.calculatedDistance)} KM</Text>
                                    :
                                    null
                            }
                        </View>

                        <H3 style={{ marginTop: 15 }}>Coords in storage</H3>
                        <ScrollView>
                            {
                                this.state.path !== null ?
                                    this.state.path.map((coords, index) => {
                                        return (
                                            <Text style={{ marginTop: 4 }} key={index}>
                                                {JSON.stringify(coords)}
                                            </Text>
                                        )
                                    })
                                    :
                                    null
                            }
                        </ScrollView>

                    </Content>
                    <Footer key={1}>
                        <FooterTab>
                            {
                                this.state.isStart ?
                                    <Button onPress={this.stop}>
                                        <Text style={styles.btnText}>Stop</Text>
                                    </Button>
                                    :
                                    <Button onPress={this.start}>
                                        <Text style={styles.btnText}>Start</Text>
                                    </Button>
                            }
                        </FooterTab>
                    </Footer>
                </Container>
            )
        }
        return (
            <Container style={styles.container}>
                <View style={[styles.loaderBox, styles.horizontal]}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            </Container>
        )
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    contentStyle: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerStyle: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: '100%',
        height: 70,
        backgroundColor: '#f6f6f6',
        elevation: 1,
        shadowOffset: {
            width: 10, height: 10,
        },
        shadowColor: 'black',
        shadowOpacity: 1.0,
    },
    backBtn: {
        marginLeft: 14,
        marginTop: '3.5%'
    },
    headerText: {
        marginLeft: 14,
        marginTop: '3%',
        fontSize: 20,
    },
    startBtnBox: {
        paddingTop: 40
    },
    loaderBox: {
        flex: 1,
        justifyContent: 'center'
    },
    horizontal: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 10
    },
    btnText: {
        color: Platform.OS === 'android' ? '#fff' : '#000',
        fontWeight: 'bold',
    }
});
