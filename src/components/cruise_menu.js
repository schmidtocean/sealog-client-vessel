import axios from 'axios';
import React, { Component } from 'react';
import Cookies from 'universal-cookie';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import moment from 'moment';
import momentDurationFormatSetup from 'moment-duration-format';
import { connect } from 'react-redux';
import { Accordion, Button, Container, Row, Col, Card, OverlayTrigger, Tooltip } from 'react-bootstrap';
import FileDownload from 'js-file-download';
import CopyLoweringToClipboard from './copy_lowering_to_clipboard';
import CopyCruiseToClipboard from './copy_cruise_to_clipboard';

import { API_ROOT_URL, MAIN_SCREEN_TXT, DEFAULT_VESSEL } from '../client_config';

import * as mapDispatchToProps from '../actions';

const CRUISE_ROUTE = "/files/cruises";
const LOWERING_ROUTE = "/files/lowerings";

const cookies = new Cookies();

class CruiseMenu extends Component {

  constructor (props) {
    super(props);

    this.state = {
      years: null,
      activeYear: (this.props.cruise.start_ts) ? moment.utc(this.props.cruise.start_ts).format("YYYY") : null,
      yearCruises: null,
      activeCruise: (this.props.cruise.id) ? this.props.cruise : null,
    };

    this.handleYearSelect = this.handleYearSelect.bind(this);
    this.handleCruiseSelect = this.handleCruiseSelect.bind(this);
    this.handleCruiseFileDownload = this.handleCruiseFileDownload.bind(this);

  }

  componentDidMount() {
    this.props.fetchCruises();
  }


  componentDidUpdate(prevProps, prevState) {

    if(this.state.years !== prevState.years && this.state.years.size > 0) {
      // console.log("year list changed");
      this.buildCruiseList();
    }

    if(this.props.cruises !== prevProps.cruises && this.props.cruises.length > 0 ) {
      // console.log("cruise list changed");
      this.buildYearList();
      const currentCruise = (this.props.cruises) ? this.props.cruises.find((cruise) => {
        const now = moment.utc();
        return (now.isBetween(moment.utc(cruise.start_ts), moment.utc(cruise.stop_ts)));
      }) : null;
      (currentCruise) ? this.buildLoweringList() : null;

      this.setState({ activeYear: (currentCruise) ? moment.utc(currentCruise.start_ts).format("YYYY") : null, activeCruise: (currentCruise) ? currentCruise : null, activeLowering: null });

    }

    if(this.state.activeYear !== prevState.activeYear && prevState.activeYear !== null ) {
      // console.log("selected year changed");
      this.setState({ activeCruise: null })
    }

    if(this.props.cruise !== prevProps.cruise && this.props.cruise.id){
      // console.log("selected cruise changed");
      this.setState({activeYear: moment.utc(this.props.cruise.start_ts).format("YYYY"), activeCruise: this.props.cruise})
    }
  }

  componentWillUnmount() {
  }

  handleYearSelect(activeYear) {
    this.setState({ activeYear });
  }

  handleCruiseSelect(id) {
    if(this.state.activeCruise === null || this.state.activeCruise && this.state.activeCruise.id !== id) {
      window.scrollTo(0, 0);
      const activeCruise = this.props.cruises.find(cruise => cruise.id === id);
      // console.log("activeCruise:", activeCruise);
      this.setState({ activeCruise });
    }
  }

  handleCruiseSelectForReplay() {
    if(this.state.activeCruise) {
      this.props.clearEvents();
      this.props.gotoCruiseReplay(this.state.activeCruise.id);
    }
  }

  handleCruiseSelectForReview() {
    if(this.state.activeCruise) {
      this.props.clearEvents();
      this.props.gotoCruiseReview(this.state.activeCruise.id);
    }
  }

  handleCruiseSelectForMap() {
    if(this.state.activeCruise) {
      this.props.clearEvents();
      this.props.gotoCruiseMap(this.state.activeCruise.id);
    }
  }

  handleCruiseSelectForGallery() {
    if(this.state.activeCruise) {
      this.props.clearEvents();
      this.props.gotoCruiseGallery(this.state.activeCruise.id);
    }
  }

  async handleCruiseFileDownload(filename) {
    await axios.get(`${API_ROOT_URL}${CRUISE_ROUTE}/${this.state.activeCruise.id}/${filename}`,
      {
        headers: {
          authorization: cookies.get('token')
        },
        responseType: 'arraybuffer'
      })
      .then((response) => {
        FileDownload(response.data, filename);
      })
      .catch(()=>{
        console.log("JWT is invalid, logging out");
      });
  }

  renderCruiseFiles(files) {
    let output = files.map((file, index) => {
      return <div className="pl-2" key={`file_${index}`}><a className="text-decoration-none" href="#"  onClick={() => this.handleCruiseFileDownload(file)}>{file}</a></div>
    });
    return <div>{output}<br/></div>;
  }

  renderCruiseCard() {

    if(this.state.activeCruise) {

      let cruiseStartTime = moment.utc(this.state.activeCruise.start_ts);
      let cruiseStopTime = moment.utc(this.state.activeCruise.stop_ts);
      let cruiseDurationValue = cruiseStopTime.diff(cruiseStartTime);

      let cruiseFiles = (this.state.activeCruise.cruise_additional_meta.cruise_files && this.state.activeCruise.cruise_additional_meta.cruise_files.length > 0)? <div><strong>Files:</strong>{this.renderCruiseFiles(this.state.activeCruise.cruise_additional_meta.cruise_files)}</div>: null;

      let cruiseName = (this.state.activeCruise.cruise_additional_meta.cruise_name)? <span><strong>Cruise Name:</strong> {this.state.activeCruise.cruise_additional_meta.cruise_name}<br/></span> : null;
      let cruiseDescription = (this.state.activeCruise.cruise_additional_meta.cruise_description)? <p className="text-justify"><strong>Description:</strong> {this.state.activeCruise.cruise_additional_meta.cruise_description}<br/></p> : null;
      let cruiseVessel = <span><strong>Vessel:</strong> {this.state.activeCruise.cruise_additional_meta.cruise_vessel}<br/></span>;
      let cruiseLocation = (this.state.activeCruise.cruise_location)? <span><strong>Location:</strong> {this.state.activeCruise.cruise_location}<br/></span> : null;
      let cruisePorts = (this.state.activeCruise.cruise_additional_meta.cruise_departure_location)? <span><strong>Ports:</strong> {this.state.activeCruise.cruise_additional_meta.cruise_departure_location} <FontAwesomeIcon icon='arrow-right' fixedWidth /> {this.state.activeCruise.cruise_additional_meta.cruise_arrival_location}<br/></span> : null;
      let cruiseDates = <span><strong>Dates:</strong> {cruiseStartTime.format("YYYY/MM/DD")} <FontAwesomeIcon icon='arrow-right' fixedWidth /> {cruiseStopTime.format("YYYY/MM/DD")}<br/></span>;
      let cruisePi = <span><strong>Chief Scientist:</strong> {this.state.activeCruise.cruise_additional_meta.cruise_pi}<br/></span>;
      // let cruiseLinkToR2R = (this.state.activeCruise.cruise_additional_meta.cruise_linkToR2R)? <span><strong>R2R Cruise Link :</strong> <a href={`${this.state.activeCruise.cruise_additional_meta.cruise_linkToR2R}`} target="_blank"><FontAwesomeIcon icon='link' fixedWidth/></a><br/></span> : null

      let cruiseDuration = <span><strong>Duration:</strong> {moment.duration(cruiseDurationValue).format("d [days] h [hours] m [minutes]")}<br/></span>;

      return (          
        <Card className="border-secondary" key={`cruise_${this.state.activeCruise.cruise_id}`}>
          <Card.Header>Cruise: <span className="text-warning">{this.state.activeCruise.cruise_id}</span><span className="float-right"><CopyCruiseToClipboard cruise={this.state.activeCruise} /></span></Card.Header>
          <Card.Body>
            {cruiseName}
            {cruisePi}
            {cruiseDescription}
            {cruiseVessel}
            {cruiseLocation}
            {cruiseDates}
            {cruisePorts}
            {cruiseDuration}
            {cruiseFiles}
            <Row className="mt-2 justify-content-center">
              <Button className="mb-1 mr-1" size="sm" variant="outline-primary" onClick={ () => this.handleCruiseSelectForReplay() }>Replay</Button>
              <Button className="mb-1 mr-1" size="sm" variant="outline-primary" onClick={ () => this.handleCruiseSelectForReview() }>Review</Button>
              <Button className="mb-1 mr-1" size="sm" variant="outline-primary" onClick={ () => this.handleCruiseSelectForMap() }>Map</Button>
              <Button className="mb-1 mr-1" size="sm" variant="outline-primary" onClick={ () => this.handleCruiseSelectForGallery() }>Gallery</Button>
            </Row>
          </Card.Body>
        </Card>
      );
    }      
  }


  buildYearList() {

    const years = new Set(this.props.cruises.map((cruise) => {
      return moment.utc(cruise.start_ts).format("YYYY");
    }));

    const activeYear = (years.size == 1) ? years.values().next().value : null;

    this.setState({years});
  }

  buildCruiseList() {

    const yearCruises = {}

    if (this.state.years && this.state.years.size > 0) {
      this.state.years.forEach((year) => {

        let startOfYear = new Date(year);
        // console.log("startOfYear:", startOfYear);
        let endOfYear = new Date(startOfYear.getFullYear()+1, startOfYear.getMonth(), startOfYear.getDate());
        // console.log("endOfYear:", endOfYear);

        // let yearCruises = this.props.cruises.filter(cruise => moment.utc(cruise.start_ts).isBetween(startOfYear, endOfYear));
        const yearCruisesTemp = this.props.cruises.filter(cruise => moment.utc(cruise.start_ts).isBetween(moment.utc(startOfYear), moment.utc(endOfYear)))
        // console.log("yearCruisesTemp:",yearCruisesTemp);
        yearCruises[year] = yearCruisesTemp.map((cruise) => { return { id: cruise.id, cruise_id: cruise.cruise_id } } );
      });

      // console.log('yearCruises:', yearCruises)
      this.setState({ yearCruises });
    }
  }

  renderYearListItems() {

    const yearCards = []

    if (this.state.yearCruises) {
      Object.entries(this.state.yearCruises).forEach(([year,cruises])=>{
        // console.log(`${year}:${cruises.join(", ")}`)

        let yearTxt = <span className={(year == this.state.activeYear || this.state.years.size == 1) ? "text-warning" : "text-primary"}>{year}</span> 

        let yearCruises = (
            cruises.map((cruise) => {
              return (<div key={`select_${cruise.id}`} className={(this.state.activeCruise && cruise.id === this.state.activeCruise.id) ? "ml-2 text-warning" : "ml-2 text-primary"} onClick={ () => this.handleCruiseSelect(cruise.id) }>{cruise.cruise_id}</div>);
            })
        );

        if (this.state.years.size > 1) {
          yearCards.unshift(
            <Card className="border-secondary" key={`year_${year}`} >
              <Accordion.Toggle as={Card.Header} eventKey={year}>
                <h6>Year: {yearTxt}</h6>
              </Accordion.Toggle>
              <Accordion.Collapse eventKey={year}>
                <Card.Body className="py-2">
                  {yearCruises}
                </Card.Body>
              </Accordion.Collapse>
            </Card>
          );
        }
        else {
          yearCards.push(
            <Card className="border-secondary" key={`year_${year}`} >
              <Card.Header>Year: {yearTxt}</Card.Header>
              <Card.Body className="py-2">
                {yearCruises}
              </Card.Body>
            </Card>
          );
        }
      })
    }

    return yearCards;
 
  }

  renderCruiseListItems() {

    return this.props.cruises.map((cruise) => {

      let cruiseName = (cruise.cruise_additional_meta.cruise_name)? <span><strong>Cruise Name:</strong> {cruise.cruise_additional_meta.cruise_name}<br/></span> : null;
      let cruiseDescription = (cruise.cruise_additional_meta.cruise_description)? <p className="text-justify"><strong>Description:</strong> {cruise.cruise_additional_meta.cruise_description}</p> : null;
      let cruiseLocation = (cruise.cruise_location)? <span><strong>Location:</strong> {cruise.cruise_location}<br/></span> : null;
      let cruiseDates = <span><strong>Dates:</strong> {moment.utc(cruise.start_ts).format("YYYY/MM/DD")} - {moment.utc(cruise.stop_ts).format("YYYY/MM/DD")}<br/></span>;
      let cruisePI = <span><strong>Chief Scientist:</strong> {cruise.cruise_additional_meta.cruise_pi}<br/></span>;
      let cruiseVessel = <span><strong>Vessel:</strong> {cruise.cruise_additional_meta.cruise_vessel}<br/></span>;
      let cruiseFiles = (cruise.cruise_additional_meta.cruise_files && cruise.cruise_additional_meta.cruise_files.length > 0)? <span><strong>Files:</strong><br/>{this.renderCruiseFiles(cruise.cruise_additional_meta.cruise_files)}</span>: null;
      
      return (          
        <Card className="border-secondary" key={cruise.id} >
          <Accordion.Toggle as={Card.Header} eventKey={cruise.id}>
            <h6>Cruise: <span className="text-primary">{cruise.cruise_id}</span></h6>
          </Accordion.Toggle>
          <Accordion.Collapse eventKey={cruise.id}>
            <Card.Body>
              {cruiseName}
              {cruiseDescription}
              {cruiseLocation}
              {cruiseVessel}
              {cruiseDates}
              {cruisePI}
              {cruiseFiles}
            </Card.Body>
          </Accordion.Collapse>
        </Card>
      );
    });      
  }

  renderYearList() {

    if(this.state.years && this.state.years.size > 1) {
      return (
        <Accordion className="border-secondary" id="accordion-controlled-year" activeKey={this.state.activeYear} onSelect={this.handleYearSelect}>
          {this.renderYearListItems()}
        </Accordion>
      );
    } else if(this.state.years && this.state.years.size > 0) {
      return (
        this.renderYearListItems()
      )
    }

    return (
      <Card className="border-secondary" >
        <Card.Body>No cruises found!</Card.Body>
      </Card>
    );
  } 

  renderCruiseList() {

    if(this.props.cruises && this.props.cruises.length > 0) {

      return (
        <Accordion id="accordion-controlled-example" activeKey={this.state.activeCruise} onSelect={this.handleCruiseSelect}>
          {this.renderCruiseListItems()}
        </Accordion>
      );
    }

    return (
      <Card className="border-secondary" >
        <Card.Body>No cruises found!</Card.Body>
      </Card>
    );
  }


  render(){
    return (
      <Container >
        <Row className="mt-2" >
            <h4>Welcome to Sealog</h4>
            <p className="text-justify">{MAIN_SCREEN_TXT}</p>
        </Row>
        <Row className="justify-content-center">
          <Col className="px-1" sm={3} md={3} lg={2}>
            {this.renderYearList()}
          </Col>
          <Col className="px-1" sm={9} md={8} lg={6}>
            {this.renderCruiseCard()}
          </Col>
        </Row>
      </Container>
    );
  }
}

function mapStateToProps(state) {
  return {
    cruise: state.cruise.cruise,
    cruises: state.cruise.cruises,
    roles: state.user.profile.roles
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(CruiseMenu);
