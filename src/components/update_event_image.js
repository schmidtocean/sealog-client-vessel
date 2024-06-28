import React, { useState, useEffect, useRef } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import { Button, Form, Modal, Alert } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { connectModal } from 'redux-modal';
import axios from 'axios';
import Cookies from 'universal-cookie';
import { FilePond, registerPlugin } from 'react-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import 'filepond/dist/filepond.min.css';
import { API_ROOT_URL } from '../client_config';
import { showModal } from '../actions';

registerPlugin(FilePondPluginFileValidateType);

const EVENT_AUX_DATA_ROUTE = "/api/v1/event_aux_data";
const FILE_ROUTE = "/files/events";
const cookies = new Cookies();

const AUX_DATA_DATASOURCE = 'SealogVesselUI';

const EventImageModal = ({ event, handleHide, showModal, roles, loggername }) => {
  const [filepondPristine, setFilepondPristine] = useState(true);
  const [eventAuxData, setEventAuxData] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const pondRef = useRef(null);

  useEffect(() => {
    fetchEventAuxData();
  }, [event.id]);

  const fetchEventAuxData = async () => {
    try {
      const response = await axios.get(`${API_ROOT_URL}${EVENT_AUX_DATA_ROUTE}?eventID=${event.id}&datasource=${AUX_DATA_DATASOURCE}`, {
        headers: { authorization: cookies.get('token') }
      });
      setEventAuxData(response.data);
    } catch (error) {
      console.error("Error fetching event aux data:", error);
      if (error.response && error.response.status === 404) {
        // Handle 404 error gracefully
        setEventAuxData([]);
      } else {
        setErrorMessage('Failed to fetch event data. Please try again.');
      }
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const files = pondRef.current.getFiles();
    
    setErrorMessage(null);
    
    for (const file of files) {
      try {
        const auxDataPayload = {
          event_id: event.id,
          data_source: AUX_DATA_DATASOURCE,
          data_array: [
            { data_name: "source", data_value: loggername },
            { data_name: "filename", data_value: file.serverId } // serverId should now be the renamed file
          ]
        };
  
        await axios.post(`${API_ROOT_URL}${EVENT_AUX_DATA_ROUTE}`, auxDataPayload, {
          headers: { authorization: cookies.get('token') }
        });
        
        // Remove the successfully processed file from FilePond
        pondRef.current.removeFile(file.id);
      } catch (error) {
        console.error(`Error creating aux data for file ${file.filename}:`, error);
        setErrorMessage(prevError => 
          (prevError ? prevError + '\n' : '') + 
          `Failed to process ${file.filename}. ${error.response?.data?.message || 'Please try again.'}`
        );
      }
    }
  
    await fetchEventAuxData();
    
    if (!errorMessage) {
      handleHide();
    }
  };

  const handleImagePreview = (filename) => {
    const imageUrl = `${API_ROOT_URL}${IMAGE_ROUTE}/${filename}`;
    showModal('imagePreview', { name: filename, filepath: imageUrl });
  };

  const handleFileDelete = async (filename, auxDataId) => {
    try {
      await axios.delete(`${API_ROOT_URL}${FILE_ROUTE}/${filename}`, {
        headers: { authorization: cookies.get('token') }
      });
      
      await axios.delete(`${API_ROOT_URL}${EVENT_AUX_DATA_ROUTE}/${auxDataId}`, {
        headers: { authorization: cookies.get('token') }
      });
      
      setEventAuxData(prevData => prevData.filter(data => data.id !== auxDataId));
    } catch (error) {
      console.error("Error deleting file or aux data:", error);
      setErrorMessage('An error occurred while deleting the file. Please try again.');
    }
  };

  const renderExistingFiles = () => {
    if (!eventAuxData || eventAuxData.length === 0) {
      return <p>No files attached to this event.</p>;
    }

    return (
      <div className="mb-2">
        {eventAuxData.flatMap(auxData => 
          auxData.data_array
            .filter(item => item.data_name === 'filename')
            .map((item, index) => (
              <div className="pl-2" key={`file_${auxData.id}_${index}`}>
                <a 
                  className="text-decoration-none" 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    handleImagePreview(item.data_value);
                  }}
                >
                  {item.data_value}
                </a>
                <FontAwesomeIcon 
                  onClick={() => showModal('deleteFile', { 
                    file: item.data_value, 
                    handleDelete: () => handleFileDelete(item.data_value, auxData.id)
                  })}
                  className='text-danger' 
                  icon='trash' 
                  fixedWidth 
                />
              </div>
            ))
        )}
      </div>
    );
  };

  if (roles && (roles.includes("admin") || roles.includes('event_manager'))) {
    return (
      <Modal size="lg" show={true} onHide={handleHide}>
        <Form onSubmit={handleFormSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Add/Edit Event Images</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
            <Form.Label>Current Event Files</Form.Label>
            {renderExistingFiles()}
            <Form.Label>Upload New Images</Form.Label>
            <FilePond
              ref={pondRef}
              allowMultiple={false}
              acceptedFileTypes={['image/*']}
              labelFileTypeNotAllowed="Only image files are allowed"
              fileValidateTypeLabelExpectedTypes="Expects: {allButLastType} or {lastType}"
              server={{
                url: API_ROOT_URL,
                process: {
                  url: FILE_ROUTE + '/filepond/process/' + event.id,
                  method: 'POST',
                  headers: { authorization: cookies.get('token') }
                },
                revert: {
                  url: FILE_ROUTE + '/filepond/revert',
                  headers: { authorization: cookies.get('token') },
                }
              }}
              onupdatefiles={(files) => {
                setFilepondPristine(files.length === 0);
                const fileNames = files.map(file => file.filename);
                const uniqueFileNames = new Set(fileNames);
                if (fileNames.length !== uniqueFileNames.size) {
                  setErrorMessage('Duplicate files detected. Please remove duplicate files before uploading.');
                } else {
                  setErrorMessage(null);
                }
              }}
            />
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" size="sm" onClick={handleHide}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" disabled={filepondPristine || errorMessage}>Submit</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    );
  } else {
    return (
      <Modal show={true} onHide={handleHide}>
        <Modal.Header closeButton>
          <Modal.Title>Access Denied</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You don't have permission to access this page.
        </Modal.Body>
      </Modal>
    );
  }
};

EventImageModal.propTypes = {
  event: PropTypes.object.isRequired,
  handleHide: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  roles: PropTypes.array.isRequired,
  loggername: PropTypes.string.isRequired
};

const mapStateToProps = (state) => ({
  roles: state.user.profile.roles,
  loggername: state.user.profile.fullname
});

const mapDispatchToProps = {
  showModal
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  connectModal({ name: 'eventImage' }),
  reduxForm({
    form: 'eventImageModal',
    enableReinitialize: true
  })
)(EventImageModal);