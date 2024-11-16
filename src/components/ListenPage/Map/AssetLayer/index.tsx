import { MarkerClusterer, useGoogleMap } from '@react-google-maps/api';
import { Clusterer } from '@react-google-maps/marker-clusterer';
import config from 'config';
import React, { Fragment, useEffect, useState } from 'react';
import { Coordinates } from 'roundware-web-framework/dist/types';
import { IAssetData } from 'roundware-web-framework/dist/types/asset';
import { OverlappingMarkerSpiderfier } from 'ts-overlapping-marker-spiderfier';
import { useRoundware } from '../../../../hooks';
import AssetMarker from './AssetMarker';

import clusterXS from '../../../../assets/audiozone_XS.svg';
import clusterS from '../../../../assets/audiozone_L.svg';
import clusterM from '../../../../assets/audiozone_M.svg';
import clusterML from '../../../../assets/Audiozone_ML.svg';
import clusterL from '../../../../assets/audiozone_L.svg';
// import clusterXL from '../../../../assets/audiozone_XL.svg';
import clusterXXL from '../../../../assets/audiozone_XXL.svg';

const OverlappingMarkerSpiderfierComponent = (props: { children: (props: OverlappingMarkerSpiderfier | null) => React.ReactNode }) => {
	const map = useGoogleMap();
	const [spiderfier, set_spiderfier] = useState<OverlappingMarkerSpiderfier | null>(null);
	if (!map) {
		return null;
	}
	if (!spiderfier) {
		const oms_obj = new OverlappingMarkerSpiderfier(map, {
			nearbyDistance: 1,
			markersWontMove: true,
			markersWontHide: true,
			basicFormatEvents: true,
		});
		set_spiderfier(oms_obj);
	}

	return <Fragment>{props.children(spiderfier)}</Fragment>;
};

const AssetLayer = ({ updateLocation }: { updateLocation: (newLocation: Coordinates) => void }) => {
	const { roundware, assetPage, selectedAsset, playingAssets } = useRoundware();

	const map = useGoogleMap();
	const assets = assetPage;
	const [markerClusterer, setMarkerClusterer] = useState<Clusterer | null>(null);

	// when the selected asset changes, pan to it
// when the selected asset changes, pan to it
useEffect(() => {
    if (!selectedAsset || !map || typeof selectedAsset.latitude !== 'number' || typeof selectedAsset.longitude !== 'number') {
        return;
    }

    // Define an offset for panning slightly above the asset
    const offset = 0.00004; // Adjust this value as needed

    const center = {
        lat: selectedAsset.latitude + offset, // Add the offset to the latitude
        lng: selectedAsset.longitude
    };

    // Pan to the location
    map.panTo(center);


    // Listener to set the zoom after the panning is complete
    const idleListener = map.addListener('idle', () => {
        //map.setZoom(config.map.zoom.high);

        // Remove the listener after the initial pan and zoom
        google.maps.event.removeListener(idleListener);
    });

    //roundware.updateLocation({ latitude: selectedAsset.latitude, longitude: selectedAsset.longitude });
    console.log(selectedAsset);
}, [selectedAsset, map]);

	if (!map) {
		return null;
	}

	const markers = (clusterer: Clusterer) => {
		const childrenRenderer = (oms: OverlappingMarkerSpiderfier | null) => assets.map((asset: IAssetData) => <AssetMarker key={asset.id} asset={asset} clusterer={clusterer} oms={oms!} />);
		return <OverlappingMarkerSpiderfierComponent children={childrenRenderer} />;
	};

	const recluster = () => {
		if (markerClusterer) {
			const markerObjs = markerClusterer.markers.slice();
			markerClusterer.clearMarkers();
			markerClusterer.repaint();
			markerClusterer.addMarkers(markerObjs, false);
		}
	};
	const wait_for_full_page = async () => {
		return new Promise<void>((resolve, reject) => {
			const checkStart = Date.now();
			const checkLength = () => {
				if (markerClusterer && assetPage.length >= markerClusterer.markers.length) {
					resolve();
				} else if (Date.now() > checkStart + 3000) {
					reject('asset page contains a different number of entries than the marker clusterer');
				} else {
					setTimeout(checkLength, 100);
				}
			};
			checkLength();
		});
	};
	useEffect(() => {
		if (!(markerClusterer && markerClusterer.ready)) return;
		wait_for_full_page().then(recluster);
	}, [markerClusterer && markerClusterer.ready, assetPage]);

const options = {
  styles: [
    {
      url: clusterXS,
      height: 50,
      width: 50,
    },
    {
      url: clusterS,  // Custom PNG for small clusters
      height: 60,
      width: 60,
    },
    {
      url: clusterM,  // Custom PNG for medium clusters
      height: 70,
      width: 70,
    },
    {
      url: clusterML,  // Custom PNG for large clusters
      height: 80,
      width: 80,
		},
	    {
      url: clusterL,  // Custom PNG for large clusters
      height: 90,
      width: 90,
    },
    // {
    //   url: clusterXL,
    //   height: 100,
    //   width: 100,
    // },
    {
      url: clusterXXL,
      height: 120,
      width: 120,
    },
  ],
};



	const handleClick = (cluster: any) => {
		updateLocation({ latitude: cluster.center.lat(), longitude: cluster.center.lng() });
		markerClusterer?.repaint();
	};

	return (
		<MarkerClusterer
			maxZoom={config.map.zoom.high - 1} //spiderFier
			onClick={handleClick}
			onLoad={setMarkerClusterer}
			minimumClusterSize={5}
			calculator={(markers, numStyles) => {
				// Most of this implementation is copied from the default calculator for
				// React google maps. Change the `styles` property to configure how
				// clusters look.
				let index = 0;
				const title = '';
				const count = markers.length.toString();
				let dv = parseInt(count);
				while (dv !== 0) {
					dv = parseInt(dv.toString(), 10) / 10;
					index++;
				}

				index = Math.min(index + 1, numStyles);

				// Change style if any contained markers are being played.
				for (const m of markers) {
					for (const a of playingAssets) {
						// @ts-ignore = need to extend marker property to suporrt asset
						if (a && a.id === m.asset.id) {
							// TODO Change this number to match whatever index in the
							// `styles` list is your "currently playing" style.
							index = 0;
							break;
						}
					}
				}

				return {
					text: '',
					index: index,
					title: title,
				};
			}}
			options={options}
			children={markers}
		/>
	);
};

export default AssetLayer;
