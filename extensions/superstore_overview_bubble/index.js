$(document).ready(() => {

  const draw = (data) => {
    console.log(data);

    // Define constants
    const width = 800,
      height = 600;

    // Create SVG
    const svg = d3
      .select("div#container")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Set Scales
    const radiusScale = d3.scaleLinear()
      .domain([d3.min(data, (d) => d["SUM(Profit)"]), d3.max(data, (d) => d["SUM(Profit)"])])
      .range([2, 80]);
    const prScale = d3.scaleLinear()
      .domain([d3.min(data, (d) => d["AGG(Profit Ratio)"]), d3.max(data, (d) => d["AGG(Profit Ratio)"])])
      .range([0, 1]);
    const colorScale = (pr) => {
      const t = prScale(pr);
      return d3.interpolateGnBu(t);
    };
    const colorScale2 = (pr) => {
      const t = prScale(pr);
      return d3.interpolateOrRd(t);
    };
    
    // Create group
    const g = svg
      .append("g")
      .style("transform", `transform(${width / 2}, ${height / 2})`);

    // Create text
    const txt = g
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("id", (d) => d["State"].replace(" ", "").replace(" ", ""))
    .text((d) => `Happy Wednesday from ${d["State"]}!`)
    .classed("hidden", true);

    // Create circles
    const circles = g
      .selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", (d) => Math.random() * width)
      .attr("cy", (d) => Math.random() * height)
      .attr("r", (d) => radiusScale(d["SUM(Profit)"]))
      .style("opacity", 0.2)
      .attr("fill", (d) => colorScale(d["AGG(Profit Ratio)"]))
      .on("mouseover", function (e, d) {
        d3.select(this).attr("fill", (d) =>
          colorScale2(d["AGG(Profit Ratio)"])
        );
        d3.select(`text#${d["State"].replace(" ", "").replace(" ", "")}`).classed("hidden", false);
      })
      .on("mouseout", function (e, d) {
        d3.select(this)
          .transition()
          .duration(250)
          .attr("fill", (d) => colorScale(d["AGG(Profit Ratio)"]));
          d3.select(`text#${d["State"].replace(" ", "").replace(" ", "")}`).classed("hidden", true);
      });

    // Create simulation
    const simulation = d3.forceSimulation(data).alpha(0.5).randomSource(0.5)
      .force("center", d3.forceCenter().x(width / 2).y(height / 2))
      .force("collision", d3.forceCollide().radius((d) => radiusScale(d["SUM(Profit)"]) + 1))
      .on("tick", () => {
        circles.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
        txt.attr("x", (d) => d.x).attr("y", (d) => d.y);
      });
  };

  readDataOnReady("Sale Map", draw, false);
});
